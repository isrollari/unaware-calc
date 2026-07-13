<script lang="ts">
  import { onMount } from 'svelte';

  const themes = ['dark', 'light', 'parchment', 'midnight'] as const;
  type Theme = (typeof themes)[number];

  let currentTheme: Theme = 'dark';
  let showPicker = false;

  onMount(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved && (themes as readonly string[]).includes(saved)) {
      currentTheme = saved;
    } else {
      currentTheme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', currentTheme);
  });

  function applyTheme(t: Theme) {
    currentTheme = t;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    showPicker = false;
  }
</script>

<slot />

<div class="theme-picker-container">
  <button class="theme-toggle" on:click={() => (showPicker = !showPicker)} title="Change theme">
    &#9680;
  </button>
  {#if showPicker}
    <div class="theme-menu">
      {#each themes as t}
        <button
          class="theme-option"
          class:active={currentTheme === t}
          on:click={() => applyTheme(t)}
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  :global(:root),
  :global([data-theme='dark']) {
    --bg: #1e1e1e;
    --surface: #2e2e2e;
    --surface-hover: #3e3e3e;
    --border: #444444;
    --text: #ffffff;
    --text-muted: #cccccc;
    --accent: #ffc72c;
    --btn: #da291c;
    --btn-hover: #b71c1c;
  }

  :global([data-theme='light']) {
    --bg: #f0f0f0;
    --surface: #e0e0e0;
    --surface-hover: #d0d0d0;
    --border: #bbbbbb;
    --text: #1a1a1a;
    --text-muted: #555555;
    --accent: #b8860b;
    --btn: #da291c;
    --btn-hover: #b71c1c;
  }

  :global([data-theme='parchment']) {
    --bg: #f4e8c1;
    --surface: #e8d5a0;
    --surface-hover: #dcc890;
    --border: #c4a35a;
    --text: #3d2b1f;
    --text-muted: #5c3d2e;
    --accent: #8b4513;
    --btn: #8b4513;
    --btn-hover: #6d3410;
  }

  :global([data-theme='midnight']) {
    --bg: #07071a;
    --surface: #0f0f2e;
    --surface-hover: #181838;
    --border: #2a2a5a;
    --text: #e0e0ff;
    --text-muted: #9090c0;
    --accent: #7b7bff;
    --btn: #4040cc;
    --btn-hover: #3030aa;
  }

  :global(body) {
    background-color: var(--bg);
    color: var(--text);
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
  }

  .theme-picker-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
  }

  .theme-toggle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--surface);
    border: 2px solid var(--border);
    color: var(--text);
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s;
    padding: 0;
  }

  .theme-toggle:hover {
    border-color: var(--accent);
  }

  .theme-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background-color: var(--surface);
    border: 2px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    min-width: 120px;
  }

  .theme-option {
    display: block;
    width: 100%;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    text-align: left;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .theme-option:hover {
    background-color: var(--surface-hover);
  }

  .theme-option.active {
    color: var(--accent);
    font-weight: bold;
  }
</style>
