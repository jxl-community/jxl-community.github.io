export {};

const form = document.querySelector<HTMLFormElement>('[data-software-filters]');
if (form) {
  const search = form.querySelector<HTMLInputElement>('#software-search')!;
  const platform = form.querySelector<HTMLSelectElement>('#software-platform')!;
  const capability = form.querySelector<HTMLSelectElement>('#software-capability')!;
  const reset = form.querySelector<HTMLButtonElement>('button[type="reset"]')!;
  const count = document.querySelector<HTMLElement>('[data-result-count]')!;
  const empty = document.querySelector<HTMLElement>('[data-software-empty]')!;
  const groups = [...document.querySelectorAll<HTMLElement>('[data-software-group]')];
  const rows = [...document.querySelectorAll<HTMLElement>('[data-software-entry]')];
  const normalize = (text: string) =>
    text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en');
  const index = new Map(
    rows.map((row) => [
      row,
      normalize(
        [
          row.textContent ?? '',
          row.dataset.keywords ?? '',
          row.closest('section')?.querySelector('h2')?.textContent ?? '',
        ].join(' '),
      ),
    ]),
  );

  function filter(updateUrl = true) {
    const words = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    const visibleIds = new Set<string>();
    for (const row of rows) {
      const text = index.get(row) ?? '';
      const matches =
        words.every((word) => text.includes(word)) &&
        (!platform.value || row.dataset.platforms!.split(' ').includes(platform.value)) &&
        (!capability.value || row.dataset.capabilities!.split(' ').includes(capability.value));
      row.hidden = !matches;
      if (matches) visibleIds.add(row.dataset.entryId!);
    }
    let visibleGroups = 0;
    for (const group of groups) {
      const size = group.querySelectorAll('[data-software-entry]:not([hidden])').length;
      group.hidden = size === 0;
      document.querySelector<HTMLElement>(`[data-category-link="${group.id}"]`)!.hidden =
        size === 0;
      document.querySelector<HTMLElement>(`[data-category-count="${group.id}"]`)!.textContent =
        String(size);
      if (size) visibleGroups++;
    }
    const visible = visibleIds.size;
    const active = Boolean(search.value || platform.value || capability.value);
    reset.hidden = !active;
    empty.hidden = visible !== 0;
    count.textContent = `${visible} ${visible === 1 ? 'tool' : 'tools'} across ${visibleGroups} ${visibleGroups === 1 ? 'category' : 'categories'}`;
    if (updateUrl) {
      const url = new URL(location.href);
      for (const [key, value] of [
        ['q', search.value.trim()],
        ['platform', platform.value],
        ['capability', capability.value],
      ]) {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
      history.replaceState(null, '', url);
    }
  }
  function restore() {
    const params = new URLSearchParams(location.search);
    search.value = params.get('q') ?? '';
    const validValue = (select: HTMLSelectElement, value: string | null) =>
      [...select.options].some((option) => option.value === value) ? value! : '';
    platform.value = validValue(platform, params.get('platform'));
    capability.value = validValue(capability, params.get('capability'));
    filter(false);
  }
  function clear() {
    search.value = '';
    platform.value = '';
    capability.value = '';
    filter();
    search.focus({ preventScroll: true });
  }
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', () => filter());
  form.addEventListener('change', () => filter());
  form.addEventListener('reset', (event) => {
    event.preventDefault();
    clear();
  });
  document.querySelector('[data-clear-filters]')?.addEventListener('click', clear);
  window.addEventListener('popstate', restore);
  restore();
  form.hidden = false;
}

// Highlight the category currently in view.
const categoryLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-category-link] > a')];
if (categoryLinks.length) {
  let frame = 0;
  const update = () => {
    frame = 0;
    const offset = innerHeight * 0.4;
    let current: HTMLElement | undefined;
    for (const group of document.querySelectorAll<HTMLElement>('[data-software-group]')) {
      if (group.hidden) continue;
      if (group.getBoundingClientRect().top - offset > 0) break;
      current = group;
    }
    for (const link of categoryLinks) {
      if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  addEventListener('scroll', () => (frame ||= requestAnimationFrame(update)), { passive: true });
  update();
}

// Report whether this browser decodes JPEG XL natively. Shares the nav's cached
// probe result; the probe image stays detached so JXL.js cannot intercept it.
const browserCheck = document.querySelector<HTMLElement>('[data-browser-check]');
if (browserCheck) {
  const show = (supported: boolean) => {
    browserCheck.dataset.state = supported ? 'yes' : 'no';
    browserCheck.textContent = supported
      ? 'Your browser displays JPEG XL images.'
      : 'Your browser can’t display JPEG XL images natively.';
    browserCheck.hidden = false;
  };
  let cached: string | null = null;
  try {
    cached = sessionStorage.getItem('jxl-native');
  } catch {}
  if (cached) show(cached === '1');
  else {
    const probe = new Image();
    const remember = (supported: boolean) => {
      try {
        sessionStorage.setItem('jxl-native', supported ? '1' : '0');
      } catch {}
      show(supported);
    };
    probe.onload = () => remember(true);
    probe.onerror = () => remember(false);
    probe.src = '/images/jxl-probe.jxl';
  }
}
