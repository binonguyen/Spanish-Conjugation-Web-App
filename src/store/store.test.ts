import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStore,
  defaultSettings,
  makeProgressKey,
  makeVocabKey,
  type LocalStore,
  type Settings,
} from './store'

const DATABASE_PREFIX = 'conjugation-trainer-test'

let store: LocalStore

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  store = await createStore({ name: `${DATABASE_PREFIX}-${Math.random()}` })
})

afterEach(() => {
  store.close()
  vi.restoreAllMocks()
})

async function seed(local: LocalStore): Promise<{ settings: Settings; progress: Record<string, unknown> }> {
  const settings = {
    ...defaultSettings(),
    vosotros: true,
    sessionLength: 30,
    defaultTenses: ['presente'],
    archaicTenses: true,
  }

  await local.saveSettings(settings)
  await local.addCustomVerb('hablar')
  await local.addCustomVerb('llamarse')
  await local.recordVerdict(makeProgressKey('hablar', 'presente', 'yo'), 'wrong')
  await local.recordVerdict(makeVocabKey('hablar'), 'accent-only')

  return { settings, progress: await local.getAllProgress() }
}

describe('settings', () => {
  it('starts from the spec defaults', async () => {
    expect(await store.getSettings()).toEqual({
      vosotros: false,
      sessionLength: 20,
      verbTier: 2,
      mode: 'conjugation',
      defaultTenses: ['presente', 'preterito_indefinido', 'preterito_imperfecto', 'futuro_simple'],
      archaicTenses: false,
    })
  })

  it('round-trips saved settings', async () => {
    const settings = {
      ...defaultSettings(),
      vosotros: true,
      sessionLength: 40,
      mode: 'vocabulary' as const,
      archaicTenses: true,
    }

    expect(await store.saveSettings(settings)).toEqual({ ok: true, value: settings })
    expect(await store.getSettings()).toEqual(settings)
  })
})

describe('progress', () => {
  it('keys progress by verb, tense and person, with vocabulary under the reserved tense', () => {
    expect(makeProgressKey('hablar', 'preterito_indefinido', 'yo')).toBe('hablar|preterito_indefinido|yo')
    expect(makeVocabKey('hablar')).toBe('hablar|vocab|')
  })

  it('counts attempts, wrong and accent-only separately', async () => {
    const key = makeProgressKey('hablar', 'preterito_indefinido', 'yo')

    await store.recordVerdict(key, 'wrong')
    await store.recordVerdict(key, 'accent-only')
    await store.recordVerdict(key, 'correct')

    expect(await store.getProgress(key)).toEqual({ attempts: 3, wrong: 1, accent: 1 })
    expect(await store.getAllProgress()).toEqual({ [key]: { attempts: 3, wrong: 1, accent: 1 } })
  })

  it('starts a fresh counter for an unseen key', async () => {
    const key = makeVocabKey('hablar')

    await store.recordVerdict(key, 'correct')

    expect(await store.getProgress(key)).toEqual({ attempts: 1, wrong: 0, accent: 0 })
  })
})

describe('custom verbs', () => {
  it('adds a hand-typed infinitive in its canonical form', async () => {
    expect(await store.addCustomVerb('  Hablar ')).toEqual({ ok: true, value: ['hablar'] })
    expect(await store.getCustomVerbs()).toEqual(['hablar'])
  })

  it('refuses a verb outside the artifact and leaves the list untouched', async () => {
    const result = await store.addCustomVerb('inventarse')

    expect(result).toMatchObject({ ok: false, error: { code: 'unknown-verb' } })
    expect(await store.getCustomVerbs()).toEqual([])
  })

  it('treats a duplicate add as already present', async () => {
    await store.addCustomVerb('hablar')

    expect(await store.addCustomVerb('HABLAR')).toEqual({ ok: true, value: ['hablar'] })
  })

  it('removes a verb and lists what remains in key order', async () => {
    await store.addCustomVerb('llamarse')
    await store.addCustomVerb('hablar')

    expect(await store.removeCustomVerb('hablar')).toEqual({ ok: true, value: ['llamarse'] })
    expect(await store.getCustomVerbs()).toEqual(['llamarse'])
  })

  it('resolves stored infinitives to artifact verbs', async () => {
    await store.addCustomVerb('llamarse')

    const resolved = await store.resolveCustomVerbs()

    expect(resolved.map((verb) => verb.infinitive)).toEqual(['llamarse'])
    expect(resolved[0]?.reflexive).toBe(true)
  })
})

describe('export and import', () => {
  it('round-trips seeded state through export, reset and import', async () => {
    const { settings, progress } = await seed(store)
    const json = await exportedJson()
    const file = JSON.parse(json) as Record<string, unknown>

    expect(file).toMatchObject({
      app: 'conjugation-trainer',
      version: 1,
      customVerbs: ['hablar', 'llamarse'],
      progress,
    })
    expect(Date.parse(String(file.exportedAt))).not.toBeNaN()

    expect(await store.resetAll('reset')).toEqual({ ok: true, value: undefined })
    expect(await store.getAllProgress()).toEqual({})
    expect(await store.getCustomVerbs()).toEqual([])
    expect(await store.getSettings()).toEqual(defaultSettings())

    expect(valueOf(await store.importJson(json, 'replace'))).toEqual({ progress: 2, customVerbs: 2 })
    expect(await store.getAllProgress()).toEqual(progress)
    expect(await store.getSettings()).toEqual(settings)
    expect(await store.getCustomVerbs()).toEqual(['hablar', 'llamarse'])
  })

  it('needs the replace confirmation before touching state', async () => {
    const { progress } = await seed(store)
    const json = await exportedJson()

    const result = await store.importJson(json, 'merge')

    expect(result).toMatchObject({ ok: false, error: { code: 'unconfirmed' } })
    expect(await store.getAllProgress()).toEqual(progress)
    expect(await store.getCustomVerbs()).toEqual(['hablar', 'llamarse'])
  })

  it('replaces state on import instead of merging it', async () => {    await seed(store)
    const json = await exportedJson()

    await store.recordVerdict(makeVocabKey('llamarse'), 'correct')
    await store.saveSettings({ ...defaultSettings(), sessionLength: 50 })
    await store.removeCustomVerb('llamarse')

    await store.importJson(json, 'replace')

    expect(await store.getProgress(makeVocabKey('llamarse'))).toBeUndefined()
    expect((await store.getSettings()).sessionLength).toBe(30)
    expect(await store.getCustomVerbs()).toEqual(['hablar', 'llamarse'])
  })

  it('refuses a newer export version and changes nothing', async () => {
    const { settings, progress } = await seed(store)
    const json = mutateExport(await exportedJson(), (file) => {
      file.version = 2
      file.progress = { 'hablar|vocab|': { attempts: 99, wrong: 0, accent: 0 } }
    })

    const result = await store.importJson(json, 'replace')

    expect(result).toMatchObject({ ok: false, error: { code: 'newer-version' } })
    expect(result.ok === false && result.error.message).toContain('version 2')
    expect(await store.getAllProgress()).toEqual(progress)
    expect(await store.getSettings()).toEqual(settings)
  })

  it('refuses a file from another app', async () => {
    const { progress } = await seed(store)
    const json = mutateExport(await exportedJson(), (file) => {
      file.app = 'another-app'
    })

    const result = await store.importJson(json, 'replace')

    expect(result).toMatchObject({ ok: false, error: { code: 'wrong-app' } })
    expect(await store.getAllProgress()).toEqual(progress)
  })

  it.each([
    ['not JSON at all', 'not json'],
    ['a JSON array', '[]'],
    ['a missing settings object', '{"app":"conjugation-trainer","version":1,"exportedAt":"2026-11-14T00:00:00Z"}'],
    [
      'a progress record with a negative count',
      '{"app":"conjugation-trainer","version":1,"exportedAt":"2026-11-14T00:00:00Z","settings":{},"customVerbs":[],"progress":{"hablar|presente|yo":{"attempts":-1,"wrong":0,"accent":0}}}',
    ],
    [
      'a session length outside 5–50',
      '{"app":"conjugation-trainer","version":1,"exportedAt":"2026-11-14T00:00:00Z","settings":{"sessionLength":100},"customVerbs":[],"progress":{}}',
    ],
  ])('refuses %s as corrupted', async (_label, json) => {
    await seed(store)

    const result = await store.importJson(json, 'replace')

    expect(result).toMatchObject({ ok: false, error: { code: 'corrupted' } })
    expect(await store.getAllProgress()).not.toEqual({})
  })

  it('resolves imported verbs the artifact no longer carries, keeping the stored name', async () => {
    await store.addCustomVerb('hablar')
    const json = mutateExport(await exportedJson(), (file) => {
      file.customVerbs = ['hablar', 'verbogone']
    })

    await store.importJson(json, 'replace')

    expect(await store.getCustomVerbs()).toEqual(['hablar', 'verbogone'])
    expect((await store.resolveCustomVerbs()).map((verb) => verb.infinitive)).toEqual(['hablar'])
  })

  it('accepts a v1 file written before the archaic setting existed', async () => {
    await seed(store)
    const json = mutateExport(await exportedJson(), (file) => {
      delete (file.settings as Record<string, unknown>).archaicTenses
    })

    expect((await store.importJson(json, 'replace')).ok).toBe(true)
    expect((await store.getSettings()).archaicTenses).toBe(false)
  })
})

describe('reset', () => {
  it('needs the typed confirmation and leaves state in place otherwise', async () => {
    const { progress } = await seed(store)

    expect(await store.resetAll('yes')).toEqual({
      ok: false,
      error: { code: 'unconfirmed', message: expect.any(String) },
    })
    expect(await store.getAllProgress()).toEqual(progress)
    expect(await store.getCustomVerbs()).toEqual(['hablar', 'llamarse'])
  })

  it('wipes progress, settings and custom verbs', async () => {
    await seed(store)

    expect(await store.resetAll('reset')).toEqual({ ok: true, value: undefined })
    expect(await store.getAllProgress()).toEqual({})
    expect(await store.getSettings()).toEqual(defaultSettings())
    expect(await store.getCustomVerbs()).toEqual([])
  })
})

describe('write failures', () => {
  it('reports a full local storage instead of throwing', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })

    const result = await store.saveSettings(defaultSettings())

    expect(result).toMatchObject({ ok: false, error: { code: 'quota' } })
    expect(result.ok === false && result.error.message).toContain('storage is full')
  })
})

function valueOf<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

async function exportedJson(): Promise<string> {
  return valueOf(await store.exportJson())
}

function mutateExport(json: string, change: (file: Record<string, unknown>) => void): string {
  const file = JSON.parse(json) as Record<string, unknown>
  change(file)
  return JSON.stringify(file)
}
