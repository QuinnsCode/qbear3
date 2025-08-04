// lib/serverActions/genericCrud.ts
'use server'

import { db } from '@/db'

// Generic result type
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Types for inputs
interface CrudParams<T extends Record<string, any>> {
  model: keyof typeof db
  input: T
  uniqueField: keyof T
}

interface GetDeleteParams<T extends Record<string, any>> {
  model: keyof typeof db
  uniqueField: keyof T
  value: T[keyof T]
}
export async function genericUpsert<T extends Record<string, any>>({
  model,
  input,
  uniqueField,
}: CrudParams<T>): Promise<ActionResult<T>> {
  try {
    const dbModel = db[model] as any

    const whereClause = {
      [uniqueField]: input[uniqueField] ?? '__new__',
    }

    const result = await dbModel.upsert({
      where: whereClause,
      update: input,
      create: input,
    })

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
export async function genericGet<T extends Record<string, any>>({
  model,
  uniqueField,
  value,
}: GetDeleteParams<T>): Promise<ActionResult<T>> {
  try {
    const dbModel = db[model] as any

    const result = await dbModel.findUnique({
      where: {
        [uniqueField]: value,
      },
    })

    if (!result) {
      return { success: false, error: 'Not found' }
    }

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
export async function genericDelete<T extends Record<string, any>>({
  model,
  uniqueField,
  value,
}: GetDeleteParams<T>): Promise<ActionResult<T>> {
  try {
    const dbModel = db[model] as any

    const result = await dbModel.delete({
      where: {
        [uniqueField]: value,
      },
    })

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
