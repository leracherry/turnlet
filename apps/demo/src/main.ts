import './styles.css';

const app = document.querySelector<HTMLElement>('#app');

if (app === null) {
  throw new Error('Turnlet demo root was not found.');
}

app.innerHTML = `
  <section class="hero" aria-labelledby="title">
    <p class="eyebrow">Turnlet</p>
    <h1 id="title">Small turns.<br />Responsive interfaces.</h1>
    <p class="summary">
      Cooperative array processing for work that belongs on the main thread.
    </p>
    <p class="status">The interactive comparison is being built.</p>
  </section>
`;
