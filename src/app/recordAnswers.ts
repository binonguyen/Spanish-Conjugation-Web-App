import type { DrillAnswer } from '../domain/drill'
import type { LocalStore } from '../store/store'

/**
 * Write the answers the store has not seen yet and report any failure. The caller
 * passes only the new tail of the session's answers, so each verdict is written once.
 */
export async function recordAnswers(
  store: LocalStore,
  answers: readonly DrillAnswer[],
): Promise<string[]> {
  const messages: string[] = []

  for (const answer of answers) {
    const result = await store.recordVerdict(answer.key, answer.verdict)
    if (!result.ok) messages.push(result.error.message)
  }

  return messages
}
