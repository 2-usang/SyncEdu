'use server';

import { randomInt } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

type SubmittedCheckpoint = {
  id?: string;
  title: string;
  description: string;
  estimated_minutes: number;
};

const CLASS_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireInstructor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, name')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== 'instructor') {
    redirect('/');
  }

  return { supabase, profile };
}

async function requireOwnedClass(classId: string) {
  const { supabase, profile } = await requireInstructor();
  const { data: classItem, error } = await supabase
    .from('classes')
    .select('id, title, status')
    .eq('id', classId)
    .eq('instructor_id', profile.id)
    .maybeSingle();

  if (error || !classItem) {
    redirect('/instructor');
  }

  return { supabase, profile, classItem };
}

function generateClassCode() {
  return Array.from({ length: 6 }, () => {
    const index = randomInt(0, CLASS_CODE_CHARACTERS.length);
    return CLASS_CODE_CHARACTERS[index];
  }).join('');
}

async function createUniqueClassCode(supabase: Awaited<ReturnType<typeof createClient>>) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const classCode = generateClassCode();
    const { data } = await supabase
      .from('classes')
      .select('id')
      .eq('class_code', classCode)
      .maybeSingle();

    if (!data) {
      return classCode;
    }
  }

  throw new Error('고유한 수업 코드를 생성하지 못했습니다.');
}

function parseTitle(formData: FormData) {
  const titleValue = formData.get('title');
  const title = typeof titleValue === 'string' ? titleValue.trim() : '';

  if (!title) {
    throw new Error('수업 제목을 입력해주세요.');
  }

  return title;
}

function parseCheckpoints(formData: FormData) {
  const rawValue = formData.get('checkpoints');

  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return [] as SubmittedCheckpoint[];
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    throw new Error('체크포인트 형식이 올바르지 않습니다.');
  }

  if (!Array.isArray(parsedValue)) {
    throw new Error('체크포인트 형식이 올바르지 않습니다.');
  }

  return parsedValue.map((checkpoint, index) => {
    if (!checkpoint || typeof checkpoint !== 'object') {
      throw new Error(`체크포인트 ${index + 1}번 형식이 올바르지 않습니다.`);
    }

    const title = typeof checkpoint.title === 'string' ? checkpoint.title.trim() : '';
    const description =
      typeof checkpoint.description === 'string' ? checkpoint.description.trim() : '';
    const estimatedMinutes = Number(checkpoint.estimated_minutes);

    if (!title) {
      throw new Error(`체크포인트 ${index + 1}번 제목을 입력해주세요.`);
    }

    if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 1) {
      throw new Error(`체크포인트 ${index + 1}번 예상 소요 시간을 확인해주세요.`);
    }

    return {
      id:
        typeof checkpoint.id === 'string' && UUID_PATTERN.test(checkpoint.id)
          ? checkpoint.id
          : undefined,
      title,
      description,
      estimated_minutes: Math.round(estimatedMinutes),
    };
  });
}

async function syncClassSetup(classId: string, formData: FormData) {
  const { supabase } = await requireOwnedClass(classId);
  const title = parseTitle(formData);
  const checkpoints = parseCheckpoints(formData);

  const { error: classError } = await supabase.from('classes').update({ title }).eq('id', classId);

  if (classError) {
    throw new Error(classError.message);
  }

  const keptIds = checkpoints
    .map((checkpoint) => checkpoint.id)
    .filter((value): value is string => Boolean(value));
  const { data: existingCheckpoints, error: existingError } = await supabase
    .from('checkpoints')
    .select('id')
    .eq('class_id', classId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const removedIds =
    existingCheckpoints
      ?.map((checkpoint) => checkpoint.id)
      .filter((checkpointId) => !keptIds.includes(checkpointId)) ?? [];

  if (removedIds.length > 0) {
    const { error: deleteError } = await supabase.from('checkpoints').delete().in('id', removedIds);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  for (const [index, checkpoint] of checkpoints.entries()) {
    const payload = {
      class_id: classId,
      order_num: index + 1,
      title: checkpoint.title,
      description: checkpoint.description,
      estimated_minutes: checkpoint.estimated_minutes,
    };

    if (checkpoint.id) {
      const { error } = await supabase
        .from('checkpoints')
        .update(payload)
        .eq('id', checkpoint.id)
        .eq('class_id', classId);

      if (error) {
        throw new Error(error.message);
      }

      continue;
    }

    const { error } = await supabase.from('checkpoints').insert(payload);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function createClassAction(formData: FormData) {
  const { supabase, profile } = await requireInstructor();
  const title = parseTitle(formData);
  const classCode = await createUniqueClassCode(supabase);

  const { data, error } = await supabase
    .from('classes')
    .insert({
      instructor_id: profile.id,
      title,
      class_code: classCode,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? '수업을 생성하지 못했습니다.');
  }

  revalidatePath('/instructor');
  redirect(`/instructor/class/${data.id}/setup`);
}

export async function saveClassSetupAction(classId: string, formData: FormData) {
  await syncClassSetup(classId, formData);
  revalidatePath('/instructor');
  revalidatePath(`/instructor/class/${classId}/setup`);
}

export async function startClassAction(classId: string, formData: FormData) {
  const { supabase } = await requireOwnedClass(classId);
  await syncClassSetup(classId, formData);

  const { error } = await supabase.from('classes').update({ status: 'live' }).eq('id', classId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/instructor');
  revalidatePath(`/instructor/class/${classId}/setup`);
  revalidatePath(`/instructor/class/${classId}/live`);
  redirect(`/instructor/class/${classId}/live`);
}
