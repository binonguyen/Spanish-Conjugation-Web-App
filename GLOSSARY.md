# Conjugation Trainer

A single-learner web app for practicing Spanish verb conjugation in chosen tenses, with English translations carried alongside so vocabulary grows with the drills.

## Language

**Verb**:
A Spanish lemma, identified by its infinitive (`hablar`, `ir`). The unit a session draws from.
_Avoid_: Word, entry, card

**Infinitive**:
The citation form of a verb, and the only form that names the verb in prompts and answers.
_Avoid_: Base form, root

**Verb pool**:
The set of verbs a session may draw from: a frequency tier (top 100 / top 500 / all), plus whichever verbs were added by hand.
_Avoid_: Deck, library, word list

**Example sentence**:
One short Tatoeba pair — a Spanish sentence containing a form of the verb, its English translation, and the Tatoeba id and author that credit it. Shown only on the reveal; it need not use the drilled tense, and a verb with no suitable pair simply has none.
_Avoid_: Quote, sample, example

**Tense**:
A named paradigm of forms, one per grammatical person, with a mood and an aspect (e.g. _pretérito indefinido_, _presente de subjuntivo_). The unit selected when building a session.
_Avoid_: Conjugation, timeframe, ending set

**Person**:
A grammatical slot in a paradigm — first/second/third person, singular/plural (yo, tú, él/ella/usted, nosotros, vosotros, ellos/ellas/ustedes). A tense supplies a form for each person, though some tenses have no form for some persons.

**Session**:
One practice run, assembled from a tense selection plus a verb pool and ended by the learner. Progress lives at the level of individual tense–verb pairs; a session is just the order they are served in.
_Avoid_: Test, quiz, lesson, round

**Review round**:
The second pass over items missed in a session's main round, asked once each after the main queue. A miss during review is recorded but not asked again.
_Avoid_: Repetition, retry, recap

**Verdict**:
The outcome of one item: _correct_, _accent-only_ (the right form without its accent marks) or _wrong_. Accent-only counts as correct in the session score and is tracked separately, because a missing accent is a different mistake from the wrong form.
_Avoid_: Score, result, pass/fail, near miss

**Conjugation drill**:
A session item that asks for one form: a verb, a tense and a person go in; the conjugated form comes out.

**Vocabulary check**:
A session item that pairs a verb with its English meaning, so the verbs met while drilling are learned as words and not just as endings.

**Mode**:
Which kind of item a session is made of — _conjugation_ or _vocabulary_. Fixed for the whole session; never mixed.
_Avoid_: Type, track, category

**Selection**:
The set of tenses a session is built from. Chosen per session; the session starts from the saved default selection, but the choice itself is not a saved profile.
_Avoid_: Preset, filter, deck

**Default selection**:
The tense selection saved in Settings and used when a new session is built. Changing tenses in the Builder affects only the current session; changing them in Settings changes what the next app start begins with.
_Avoid_: Saved selection, profile
