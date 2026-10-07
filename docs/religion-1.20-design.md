# Religion migration for CK3 1.20

The source inventory is [religion-1.19-inventory.json](religion-1.19-inventory.json).
It records every original religion and faith with explicit doctrines, tenets,
conditional tenets, and holy sites before migration.

## Structure and decisions

CK3 1.20 keeps religion, faith, and rite in separate databases. A religion
defines shared doctrines and names. A faith owns holy sites and its main rite.
A rite owns its core tenets and doctrines that vary within the faith. The
mod's history now assigns rites, while bookmark `religion` values still name
the playable rite, matching the vanilla bookmark format.

There were 30 religions and 60 faiths. The result has 30 religions, 57 faiths,
and 60 stable scripted rites. Every retained faith has a rite of the same key.
These four original faith keys became rites of a broader faith:

| Original key | Parent faith | Reason |
| --- | --- | --- |
| `methodism` | `protestant` | A Protestant denomination without a separate religious head. |
| `presbyterianism` | `protestant` | A Protestant denomination and the new faith's initial main rite. |
| `baptists` | `protestant` | A Protestant denomination whose distinct tenets and doctrines fit a rite. |
| `xiism` | `maoism` | The same holy sites and most doctrines as Maoism, with one core tenet changed. |

The new `protestant` faith uses an existing localization key. Its shared
eminent sites are Incheon, Pyongyang, and Jongno; Hwado, Gimpo, Iksan, and
Jeonju remain ordinary sites. `maoism` keeps its five existing sites.

The following apparent variants remain separate faiths:

- `orthodox`, `rusortho`, and `hamortho`: the descriptions make the
  primacy of the Far Eastern patriarch a point of schism. Sharing one head
  of faith would erase that conflict.
- `anglicanism` and `lutheran`: each has its own religious head.
  `imperial_church` and `holy_spirit` also retain their leadership.
- `jogye`, `maitreya`, `bailian`, and `tibetan`: their core beliefs
  diverge. Tibetan Buddhism also has a different holy-site network.
- `marxism`, `maoism`, and `new_left`: they differ in social doctrine,
  revolutionary program, and sacred geography.
- `cheondo` and `cheonjin`, both Manchurian dynastic cults, and the
  Mechanism offshoots: their leadership, patronage, or syncretism differ
  beyond local practice.
- The Koreanist, Juche, Islamic, Confucian, New World, and other branches
  retain faith status where the original tenets describe a distinct creed.

All 30 original religion keys stay stable because scripts use them as
religion tags. Unifying the Christian religions would require redesigning
those religion-level triggers and their inherited doctrines.

## Doctrine, tenet, and holy-site migration

Original faith tenets are now on the corresponding rite. Original faith
doctrine overrides are also on the rite, so the 1.19 starting rules remain
specific to each tradition. Religion-level doctrine defaults stay on the
religion. The seven DLC-conditional tenet choices became
`tenet_selection_pair` entries.

Custom tenets moved to `tenet_types`. Custom tenets and doctrines now use
1.20 parameter flags and `special_parameters` for hostility and
syncretic opinion rules; custom doctrines declare their groups. The
mod-specific `doctrine_atheist` was retained
in the `doctrine_theism` group. Obsolete copies of vanilla 1.19 doctrine
and group databases were removed so that 1.20 supplies those definitions.

The removed `tenet_monasticism` is represented by a monasticism doctrine
on its eight affected rites. A replacement core tenet was chosen for each:
`tenet_pursuit_of_knowledge` for Atomism; `tenet_inner_journey` for
Jogye and Tibetan Buddhism; and 1.20 Christian tenets with non-DLC
fallbacks for Catholic, Orthodox, Russian Orthodox, Hamheung Orthodox,
and Anglican rites.

For the remaining faiths, the first three old holy sites are eminent and
the rest are ordinary. This uses the 1.20 default limit of three globally
rewarding eminent sites. Faiths with no original sites remain without sites;
their religions explicitly allow a zero-site minimum. All original site
keys are preserved.

## Verification boundary

`node validate_religion_120.js` checks the installed 1.20 game data for
religion, faith, rite, tenet, doctrine, group, and holy-site references,
checks all character and province history rite assignments, and compares
the result with the original inventory for lost tenets, doctrines, or sites.
It does not exercise
CK3's runtime script parser or the rest of the total conversion. On another
installation, set `CK3_GAME_DIR` to the CK3 `game` directory before running it.
