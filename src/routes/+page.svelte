<script lang="ts">
  // You can add any necessary imports here
</script>

<main>
  <h1>Mortal Online 2 Calculators</h1>

  <div class="navigation-links">
    <div class="grid-item">
      <a href="/resource-calculator">
        <span class="item-text">Go to Gather Calculator</span>
      </a>
      <p class="item-description">Calculate how many resources to gather in order to produce metal</p>
    </div>
    <div class="grid-item">
      <a href="/tree-traversal">
        <span class="item-text">Go to Refiner Calculator</span>
      </a>
      <p class="item-description">See what you can make with materials you already have</p>
    </div>
    <div class="grid-item">
      <a href="/optimized-calculator">
        <span class="item-text">Go to Optimized Calculator</span>
      </a>
      <p class="item-description">Hybrid between Refiner and Gatherer Calculators, in progress</p>
    </div>
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
  }

  .grid-item:hover {
    background-color: #3e3e3e;
    border-color: #ffc72c;
  }

  .grid-item a {
    color: #ffc72c;
    text-decoration: none;
    font-size: 1.1rem;
  }

  .item-text {
    display: block;
    padding: 5px 0;
  }

  .item-description {
    color: #cccccc;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }
</style>