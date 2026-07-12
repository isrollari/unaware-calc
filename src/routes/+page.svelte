<script lang="ts">
  // You can add any necessary imports here
</script>

<main>
  <h1>Mortal Online 2 Calculators</h1>

  <div class="navigation-links">
    <a href="/resource-calculator" class="grid-item">
      <span class="item-text">Shopping List</span>
      <p class="item-tagline">"I want to make X &mdash; what do I gather?"</p>
      <p class="item-description">Pick a metal like Steel or Cronite and get the complete list of raw ore and catalysts to mine or buy, plus step-by-step instructions for every machine along the way.</p>
    </a>
    <a href="/tree-traversal" class="grid-item">
      <span class="item-text">What Can I Make?</span>
      <p class="item-tagline">"I have X &mdash; what does it turn into?"</p>
      <p class="item-description">Pick a material sitting in your bank and explore everything it can be processed into, with exact yields at every step. Great for deciding what to do with a pile of loot or ore.</p>
    </a>
    <a href="/optimized-calculator" class="grid-item">
      <span class="item-text">Smart Planner</span>
      <p class="item-tagline">"I want X and already have some of the parts."</p>
      <p class="item-description">Tell it your goal and check off materials you already own &mdash; it plans the route that uses your stockpile first, can buy catalysts from the vendor, and avoids machines you don't have. (Beta)</p>
    </a>
  </div>
</main>

<style>
  :global(body) {
    background-color: #1e1e1e;
    color: #ffffff;
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
  }

  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    color: #ffc72c;
    text-align: center;
    margin-bottom: 2rem;
  }

.navigation-links {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    margin: 2rem 0;
  }

  .grid-item {
    background-color: #2e2e2e;
    border: 2px solid #444;
    border-radius: 4px;
    padding: 15px 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    max-width: 400px;
    text-decoration: none;
    display: block;
  }

  .grid-item:hover {
    background-color: #3e3e3e;
    border-color: #ffc72c;
  }

  .grid-item .item-text {
    color: #ffc72c;
    font-size: 1.1rem;
    display: block;
    padding: 5px 0;
  }

  .item-tagline {
    color: #ffc72c;
    opacity: 0.85;
    font-style: italic;
    font-size: 0.9rem;
    margin: 0.4rem 0 0.2rem;
  }

  .item-description {
    color: #cccccc;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }
</style>