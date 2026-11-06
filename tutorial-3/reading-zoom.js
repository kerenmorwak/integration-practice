(() => {
  'use strict';
  const main = document.querySelector('main');
  const controls = document.querySelector('.reading-zoom');
  let zoom = 1;
  function render() {
    const style = getComputedStyle(document.body);
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const fitWidth = Math.min(1100, document.documentElement.clientWidth - padding);
    main.style.width = `${fitWidth * zoom}px`;
    controls.querySelector('[data-zoom="out"]').disabled = zoom === 1;
    controls.querySelector('[data-zoom="in"]').disabled = zoom === 3;
  }
  controls.addEventListener('click', event => {
    const button = event.target.closest('button[data-zoom]');
    if (!button) return;
    if (button.dataset.zoom === 'fit') zoom = 1;
    else zoom = Math.max(1, Math.min(3, zoom + (button.dataset.zoom === 'in' ? .5 : -.5)));
    render();
  });
  window.addEventListener('resize', render);
  render();
})();
