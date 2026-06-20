export const DRAFT_FIRST_NAMES = [
  'Marcus', 'Jaylen', 'Devin', 'Cameron', 'Tyler', 'Jordan', 'Brandon', 'Darius',
  'Malik', 'Andre', 'Chris', 'Kevin', 'Anthony', 'Isaiah', 'Terrence', 'Jamal',
  'Elijah', 'Noah', 'Liam', 'Owen', 'Mason', 'Lucas', 'Ethan', 'Aiden',
  'Zion', 'Kai', 'Amari', 'Jalen', 'Trey', 'DeShawn', 'Xavier', 'Quentin',
]

export const DRAFT_LAST_NAMES = [
  'Williams', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
  'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia',
  'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King',
  'Wright', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell',
]

export function pickRandomName(
  used: Set<string>,
  rng: { nextInt: (min: number, max: number) => number },
): { firstName: string; lastName: string } {
  for (let attempt = 0; attempt < 50; attempt++) {
    const firstName = DRAFT_FIRST_NAMES[rng.nextInt(0, DRAFT_FIRST_NAMES.length - 1)]!
    const lastName = DRAFT_LAST_NAMES[rng.nextInt(0, DRAFT_LAST_NAMES.length - 1)]!
    const key = `${firstName} ${lastName}`
    if (!used.has(key)) {
      used.add(key)
      return { firstName, lastName }
    }
  }
  const firstName = DRAFT_FIRST_NAMES[rng.nextInt(0, DRAFT_FIRST_NAMES.length - 1)]!
  const lastName = `${DRAFT_LAST_NAMES[rng.nextInt(0, DRAFT_LAST_NAMES.length - 1)]!}${rng.nextInt(1, 99)}`
  return { firstName, lastName }
}
