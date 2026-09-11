function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function MessengerMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.616 4.469 8.652V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963-3.055-3.26-5.963 3.26L10.732 8.1l3.131 3.259L19.752 8.1l-6.561 6.863z"
      />
    </svg>
  );
}

const communities = [
  {
    href: 'https://www.facebook.com/groups/344817755279579',
    title: 'Facebook-gruppe',
    description: 'Begivenheder',
    Icon: FacebookMark,
  },
  {
    href: 'https://m.me/cm/AbYENzeA-zffYS7N/',
    title: 'Messenger-gruppe',
    description: 'Primær kommunikation',
    Icon: MessengerMark,
  },
] as const;

export default function CommunityLinks() {
  return (
    <section className="mx-auto mb-16 w-full max-w-xl" aria-labelledby="community-heading">
      <h2
        id="community-heading"
        className="mb-4 text-center text-sm font-medium tracking-wide text-gray-500 dark:text-gray-400"
      >
        Fællesskab
      </h2>
      <div className="divide-y divide-gray-200/60 overflow-hidden rounded-2xl border border-white/50 bg-white/50 backdrop-blur-xl dark:divide-white/10 dark:border-white/10 dark:bg-gray-900/40">
        {communities.map((community) => (
          <a
            key={community.href}
            href={community.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/50 dark:hover:bg-white/5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900/5 text-gray-500 dark:bg-white/10 dark:text-gray-400">
              <community.Icon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                {community.title}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {community.description}
              </span>
            </span>
            <span className="text-gray-400 dark:text-gray-500" aria-hidden>
              →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
