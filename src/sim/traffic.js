// Packet generation per source. Pure functions, no React/DOM.

function poissonSample(rate, rng) {
  if (rate <= 0) return 0;
  const L = Math.exp(-rate);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng();
  } while (p > L);
  return k - 1;
}

/**
 * @param {object} source - runtime source ({ pattern, ... })
 * @param {number} effectiveRate - packets/tick (rate * rateFactor)
 * @param {number} tick - current tick
 * @param {function} rng - () => [0,1)
 * @param {object} acc - mutable { frac, burstOn, burstLeft }
 * @returns {number} integer count of new packets this tick
 */
export function generate(source, effectiveRate, tick, rng, acc) {
  const pattern = source.pattern || 'constant';
  const rate = Math.max(0, effectiveRate || 0);

  if (pattern === 'constant') {
    acc.frac += rate;
    const n = Math.floor(acc.frac);
    acc.frac -= n;
    return n;
  }

  if (pattern === 'bursty') {
    // ON/OFF. ON emits at 3x rate, OFF emits 0. Duty cycle ~1/3 so avg ~= rate.
    if (acc.burstLeft <= 0) {
      if (acc.burstOn) {
        acc.burstOn = false;
        acc.burstLeft = 4 + Math.floor(rng() * 9); // 4..12
      } else {
        acc.burstOn = true;
        acc.burstLeft = 2 + Math.floor(rng() * 5); // 2..6
      }
    }
    let n = 0;
    if (acc.burstOn) {
      acc.frac += rate * 3;
      n = Math.floor(acc.frac);
      acc.frac -= n;
    } else {
      // keep frac bounded so long OFF periods don't bank credit
      acc.frac = 0;
    }
    acc.burstLeft -= 1;
    return n;
  }

  if (pattern === 'random') {
    return poissonSample(rate, rng);
  }

  // fallback: constant
  acc.frac += rate;
  const n = Math.floor(acc.frac);
  acc.frac -= n;
  return n;
}
