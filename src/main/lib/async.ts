const delay = async (millis: number) => {
  return new Promise(resolve => setTimeout(resolve, millis));
}

const waitFor = (
  condition: () => boolean,
  onConditionTrue: () => void,
  intervalMillis: number = 1000
) => {
  const waitLoop = () => {
    if (condition()) {
      onConditionTrue();
    } else {
      setTimeout(waitLoop, intervalMillis);
    }
  }
  waitLoop();
}

export {
  delay,
  waitFor,
}
