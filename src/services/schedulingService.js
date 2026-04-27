const getActiveContentByRotation = (contents) => {
  if (!contents || contents.length === 0) {
    return null;
  }

  const now = new Date();

  const activeContents = contents.filter((item) => {
    if (!item.start_time || !item.end_time) return false;

    const startTime = new Date(item.start_time);
    const endTime = new Date(item.end_time);

    return now >= startTime && now <= endTime;
  });

  if (activeContents.length === 0) {
    return null;
  }

  activeContents.sort((a, b) => a.rotation_order - b.rotation_order);

  const totalDurationInSeconds = activeContents.reduce((sum, item) => {
    return sum + Number(item.duration || 5) * 60;
  }, 0);

  const currentSecond = Math.floor(Date.now() / 1000);
  const cyclePosition = currentSecond % totalDurationInSeconds;

  let accumulatedSeconds = 0;

  for (const item of activeContents) {
    accumulatedSeconds += Number(item.duration || 5) * 60;

    if (cyclePosition < accumulatedSeconds) {
      return item;
    }
  }

  return activeContents[0];
};

module.exports = {
  getActiveContentByRotation
};