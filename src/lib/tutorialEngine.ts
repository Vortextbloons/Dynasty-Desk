export interface TutorialStep {
  id: string
  targetSelector: string
  title: string
  body: string
  position: 'top' | 'bottom' | 'left' | 'right'
  nextTrigger: 'click' | 'manual' | 'route_change'
}

export const FIRST_RUN_TUTORIAL: TutorialStep[] = [
  {
    id: 'new-league',
    targetSelector: '[data-tour="new-league"]',
    title: 'Start a New League',
    body: "Click here to create a new dynasty. You'll pick your team and start building.",
    position: 'bottom',
    nextTrigger: 'click',
  },
  {
    id: 'team-select',
    targetSelector: '[data-tour="team-select"]',
    title: 'Choose Your Team',
    body: 'Select the franchise you want to manage. Each team has unique strengths and challenges.',
    position: 'bottom',
    nextTrigger: 'manual',
  },
  {
    id: 'set-lineup',
    targetSelector: '[data-tour="lineup"]',
    title: 'Set Your Lineup',
    body: 'Arrange your starters, bench, and closing lineup. Minutes allocation is key to success.',
    position: 'right',
    nextTrigger: 'manual',
  },
  {
    id: 'sim-game',
    targetSelector: '[data-tour="sim"]',
    title: 'Sim Your First Game',
    body: 'Watch your team in action. You can sim single games, days, or entire seasons.',
    position: 'left',
    nextTrigger: 'manual',
  },
]
