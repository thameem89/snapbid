export const disclosure =
  'Rankings are sponsored placements determined by cumulative purchased promotion value.';
export const disclaimer =
  'This service is an independent promotional ranking platform and is not affiliated with, endorsed by, sponsored by or administered by Snap Inc. or Snapchat.';
export const policies: Record<
  string,
  { title: string; sections: [string, string][] }
> = {
  'how-it-works': {
    title: 'A little boost. A bigger spotlight.',
    sections: [
      [
        '01 / Find a profile',
        'Search or add a public social profile. Browse its city, country, continent, and world sponsored rankings.',
      ],
      [
        '02 / Boost visibility',
        'Purchase promotional value starting at $1 USD. You can support a profile without claiming to own it.',
      ],
      [
        '03 / Climb the sponsored rankings',
        'After secure payment verification, your purchase contributes to cumulative promotional value. Positions can change as other profiles receive promotion.',
      ],
      [
        'Always transparent',
        'This is a sponsored leaderboard, not an objective measure of popularity.',
      ],
    ],
  },
  'ranking-rules': {
    title: 'The rules of the spotlight.',
    sections: [
      [
        'Purchased promotion',
        'Promotion purchases start at $1 USD. Only verified, non-reversed promotion value contributes to a public position. No permanent position is guaranteed.',
      ],
      [
        'Deterministic positions',
        'Approved accounts are ordered by cumulative verified promotion value, highest first. Equal values are ordered by the time of the account’s first verified promotion, earliest first. A stable account ID breaks identical timestamp ties. This timestamp refers to the first promotion, not when a later total was reached.',
      ],
      [
        'Geographic rankings',
        'An account participates in its assigned location and relevant ancestors. Location is declared unless marked verified. Administrators can investigate disputes and correct location.',
      ],
      [
        'Estimates and payment confirmation',
        'Target suggestions use the current leaderboard and the tie rule. Final position is calculated after server-side payment confirmation. Other purchases may occur during checkout.',
      ],
      [
        'Refunds, disputes, and suspension',
        'Full and partial refunds remove the refunded promotional value. Disputed payments remove the disputed purchase’s value. Suspended accounts are excluded from public rankings. Payment history remains auditable.',
      ],
      [
        'Listings and ownership',
        'Anyone may support a listed profile. A purchase never establishes ownership. Ownership claims are reviewed separately. Unclaimed listings are not verified owners.',
      ],
      ['Platform independence', disclaimer],
    ],
  },
  'content-policy': {
    title: 'A spotlight worth sharing.',
    sections: [
      [
        'Allowed profiles',
        'Public creator, brand, and business profiles must be accurately represented. Do not submit impersonation, harassment, illegal content, sexual exploitation, or private information.',
      ],
      [
        'Review and enforcement',
        'Report questionable accounts from their profile. Administrators can reject or suspend listings, review ownership evidence, and correct inaccurate locations.',
      ],
    ],
  },
  refunds: {
    title: 'Refund policy.',
    sections: [
      [
        'Request review',
        'Contact the operator through the configured support channel and include your provider receipt or purchase reference. Never send card details. Refund eligibility and statutory rights must be finalized before launch.',
      ],
      [
        'Ranking effects',
        'A provider-confirmed full or partial refund removes the corresponding promotional value. Disputes remove the disputed purchase value. Refunds return through the original payment provider, never to an internal wallet.',
      ],
    ],
  },
  privacy: {
    title: 'Your privacy matters.',
    sections: [
      [
        'Public information',
        'Public pages show intended social-profile information, declared or reviewed location, sponsored positions, and promotion history without payer identity.',
      ],
      [
        'Private information',
        'Authentication data, private ownership evidence, payer information, and moderation notes are restricted. Payment cards are handled by the payment provider.',
      ],
      [
        'Analytics',
        'Minimal first-party events measure profile views, outbound clicks, checkout starts, verified purchases, and sharing. Signed-in purchase history can measure repeat promotion. Guest identity is not exposed. Retention periods and data requests must be finalized before launch.',
      ],
    ],
  },
  terms: {
    title: 'Terms of service.',
    sections: [
      [
        'The service',
        'Climbr sells promotional placement value for social profiles. Purchased value is cumulative and positions remain competitive. Purchases do not guarantee followers, engagement, or permanent placement.',
      ],
      [
        'Responsible use',
        'You must provide accurate information and comply with our content policy. The operator may suspend accounts and investigate misuse. Eligibility, contracting entity, jurisdiction, and consumer protections require legal review before launch.',
      ],
      ['Independent platform', disclaimer],
    ],
  },
  contact: {
    title: 'Let’s talk.',
    sections: [
      [
        'Support and feedback',
        'For profile corrections, ownership questions, and payment support, use the operator’s support channel. Support contact details have not yet been configured.',
      ],
      [
        'Report a profile',
        'Use the report action on any account page. Ownership evidence and reports remain private.',
      ],
    ],
  },
};
