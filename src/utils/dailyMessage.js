const WEEKDAY_MESSAGES = {
  0: {
    emoji: "🌅",
    text: "Happy Sunday! Fresh week, fresh start. Let's go,",
    color: "#1e4453ff",
  },
  1: {
    emoji: "💪",
    text: "Monday momentum! Let's get after it,",
    color: "#374f3bff",
  },
  2: {
    emoji: "⚡",
    text: "Keep the pace going,",
    color: "#3e395cff",
  },
  3: {
    emoji: "🐫",
    text: "Halfway through the week. You've got this,",
    color: "#7A5A9E",
  },
  4: {
    emoji: "🔥",
    text: "Almost there! Finish strong,",
    color: "#73552dff",
  },
  5: {
    emoji: "🎉",
    text: "Happy Friday! You made it to the weekend,",
    color: "#5d421fff",
  },
  6: {
    emoji: "☀️",
    text: "Happy Saturday! Enjoy the day off,",
    color: "#25404bff",
  },
};

export function getDailyMessage(isoDate, holidayName) {
  if (holidayName) {
    return {
      emoji: "🎊",
      text: `Holiday today — ${holidayName},`,
      color: "#B5563A",
    };
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  return WEEKDAY_MESSAGES[dayOfWeek] || WEEKDAY_MESSAGES[0];
}

