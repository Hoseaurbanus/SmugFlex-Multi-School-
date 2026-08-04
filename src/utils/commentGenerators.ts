// Auto-comment generation system for result compilation

export const commentTemplates = {
  excellent: [
    "Outstanding performance! Shows exceptional understanding and mastery of all subjects.",
    "Brilliant academic achievement. Maintains excellent standards across all areas.",
    "Exceptional student who demonstrates outstanding intellectual capacity and diligence.",
    "Remarkable performance! A true academic star with exemplary conduct.",
    "Outstanding achievement! Consistently exceeds expectations in all subjects.",
    "Exceptional work! Demonstrates superior analytical thinking and problem-solving skills.",
    "Brilliant results! Shows remarkable dedication to academic excellence.",
    "Outstanding scholar! Maintains highest standards in all academic pursuits.",
    "Exceptional performance! A model student with outstanding intellectual abilities.",
    "Brilliant achievement! Demonstrates exceptional mastery of course material."
  ],
  veryGood: [
    "Very good performance. Shows strong understanding and consistent effort.",
    "Commendable academic achievement with room for further improvement.",
    "Impressive performance! Demonstrates strong analytical skills and dedication.",
    "Very good result! Shows promise and potential for continued excellence.",
    "Strong academic performance with consistent effort and good understanding.",
    "Excellent work! Displays solid grasp of concepts and good analytical abilities.",
    "Commendable results! Shows strong academic capabilities and dedication.",
    "Very good achievement! Demonstrates consistent effort and understanding.",
    "Strong performance! Shows good command of subject matter and analytical skills.",
    "Impressive work! Displays academic potential and consistent dedication."
  ],
  good: [
    "Good performance. Shows satisfactory understanding and steady progress.",
    "Satisfactory academic achievement with areas for improvement.",
    "Good effort shown. Consistent progress noted throughout the term.",
    "Decent performance! With more effort, could achieve much higher results.",
    "Fair performance showing understanding of core concepts.",
    "Good work! Demonstrates adequate understanding and room for growth.",
    "Satisfactory results! Shows steady progress and basic comprehension.",
    "Decent achievement! Could benefit from additional study and practice.",
    "Fair performance! Shows understanding of fundamental concepts.",
    "Good effort! Demonstrates potential for improvement with dedicated work."
  ],
  average: [
    "Average performance. Needs to put in more effort to improve.",
    "Satisfactory but needs improvement in several areas.",
    "Fair performance. Could benefit from additional study and practice.",
    "Average result. More dedication needed for better performance.",
    "Moderate performance showing need for increased effort.",
    "Fair work! Requires more dedication and consistent study habits.",
    "Average results! Needs to focus more on academic responsibilities.",
    "Satisfactory performance! Could improve with better study methods.",
    "Moderate achievement! Requires increased effort and attention.",
    "Fair work! Needs to develop better study habits and consistency."
  ],
  belowAverage: [
    "Below average performance. Requires significant improvement and attention.",
    "Needs considerable improvement in academic performance and attitude.",
    "Poor performance. Must show more commitment to studies.",
    "Below expected standards. Immediate improvement required.",
    "Unsatisfactory performance requiring urgent attention and support.",
    "Weak performance! Needs serious attention to academic responsibilities.",
    "Below average results! Requires immediate intervention and support.",
    "Poor work! Must demonstrate greater commitment to learning.",
    "Unsatisfactory achievement! Needs comprehensive academic support.",
    "Weak performance! Requires urgent attention to study habits."
  ],
  poor: [
    "Poor performance. Requires immediate intervention and support.",
    "Very poor academic result. Needs serious attention to studies.",
    "Unsatisfactory performance in all aspects. Major improvement needed.",
    "Extremely poor result. Requires comprehensive academic support.",
    "Failing performance. Must seek help and show dramatic improvement.",
    "Very weak performance! Needs immediate academic intervention.",
    "Extremely poor results! Requires comprehensive support and guidance.",
    "Failing work! Must demonstrate complete commitment to improvement.",
    "Very poor achievement! Needs urgent and sustained academic support.",
    "Extremely weak performance! Requires immediate intervention and dedication."
  ]
};

export const positionComments = {
  top: [
    "Outstanding class position! Shows exceptional academic ability.",
    "Excellent class ranking! Among the best performers in class.",
    "Brilliant class position! Demonstrates superior academic excellence.",
    "Exceptional ranking! A true academic leader in the class.",
    "Outstanding achievement! Maintains highest academic standards.",
    "Excellent class standing! Shows remarkable intellectual capabilities.",
    "Top position! Demonstrates exceptional mastery of all subjects.",
    "Brilliant ranking! An exemplary student with outstanding abilities."
  ],
  upper: [
    "Good class position. Shows strong academic performance.",
    "Commendable class ranking. Above average performance.",
    "Strong class position! Demonstrates solid academic abilities.",
    "Good ranking! Shows consistent effort and understanding.",
    "Commendable standing! Above average academic achievement.",
    "Strong performance! Well-positioned among high achievers.",
    "Good class ranking! Displays solid academic capabilities.",
    "Commendable position! Shows promise for continued excellence."
  ],
  middle: [
    "Average class position. Room for improvement in ranking.",
    "Fair class position. Could work towards higher ranking.",
    "Moderate class standing. Needs more effort to improve position.",
    "Average ranking! Potential for better academic performance.",
    "Fair position! Could benefit from increased dedication.",
    "Middle ranking! Room for improvement with consistent effort.",
    "Average standing! Needs focus to achieve higher position.",
    "Moderate position! Can improve with better study habits."
  ],
  lower: [
    "Below average class position. Needs significant improvement.",
    "Poor class ranking. Must work harder to improve position.",
    "Low class position. Requires immediate attention to studies.",
    "Weak ranking! Needs substantial improvement in performance.",
    "Poor standing! Must demonstrate greater academic commitment.",
    "Low position! Requires urgent intervention and support.",
    "Weak ranking! Needs comprehensive academic improvement.",
    "Poor position! Must show dramatic improvement in studies."
  ]
};

export const constructiveFeedback = {
  excellent: [
    "Continue maintaining excellent standards. Consider advanced studies.",
    "Outstanding work! Explore leadership roles and academic competitions.",
    "Exceptional performance! Consider mentoring other students.",
    "Brilliant achievement! Pursue advanced academic challenges.",
    "Excellent results! Consider participating in academic enrichment programs."
  ],
  veryGood: [
    "Strong performance! With extra effort, could reach excellence.",
    "Very good work! Focus on weak areas to achieve outstanding results.",
    "Commendable achievement! Additional practice could lead to excellence.",
    "Strong results! Target specific areas for improvement.",
    "Very good performance! Consistent effort will lead to top ranking."
  ],
  good: [
    "Good effort! Increase study time for better results.",
    "Satisfactory work! Focus on understanding concepts deeply.",
    "Good performance! Develop better study habits and consistency.",
    "Decent achievement! Seek help in challenging subjects.",
    "Fair work! More dedication will lead to significant improvement."
  ],
  average: [
    "Needs improvement! Develop consistent study routine.",
    "Fair performance! Seek additional help from teachers.",
    "Average work! Focus on fundamentals and practice regularly.",
    "Satisfactory results! Increase study time and concentration.",
    "Moderate achievement! Join study groups and seek tutoring."
  ],
  belowAverage: [
    "Requires immediate attention! Seek help from teachers and tutors.",
    "Poor performance! Develop basic study skills and habits.",
    "Below average work! Attend extra classes and seek counseling.",
    "Weak achievement! Requires comprehensive academic support.",
    "Unsatisfactory results! Must change study approach completely."
  ],
  poor: [
    "Critical situation! Requires intensive academic intervention.",
    "Very poor work! Must seek comprehensive support immediately.",
    "Failing performance! Requires one-on-one tutoring and counseling.",
    "Extremely weak results! Must consider academic probation.",
    "Critical achievement! Requires complete academic rehabilitation."
  ]
};

export function generateAutoComment(averageScore: number): string {
  if (averageScore >= 90 && averageScore <= 100) {
    return 'An excellent result Keep it up.';
  } else if (averageScore >= 80 && averageScore < 90) {
    return 'A very good result, Keep it up.';
  } else if (averageScore >= 70 && averageScore < 80) {
    return 'A good result, You can do better.';
  } else if (averageScore >= 60 && averageScore < 70) {
    return 'A satisfactory result, you can do better.';
  } else if (averageScore >= 50 && averageScore < 60) {
    return 'A Fair result you have it in you to do better.';
  } else {
    return 'Fail';
  }
}

export function parseAttendedDaysFromRemarks(remarks: unknown): number {
  if (typeof remarks !== 'string') return 0;
  const match = remarks.match(/(\d+)\s*out\s*of\s*(\d+)\s*days/i);
  if (!match) return 0;
  const attended = parseInt(match[1], 10);
  return Number.isFinite(attended) ? attended : 0;
}

export function parseAttendanceFromRemarks(remarks: unknown): { attendedDays: number; requiredDays: number } {
  if (typeof remarks !== 'string') return { attendedDays: 0, requiredDays: 0 };
  const match = remarks.match(/(\d+)\s*out\s*of\s*(\d+)\s*days/i);
  if (!match) return { attendedDays: 0, requiredDays: 0 };

  const attended = parseInt(match[1], 10);
  const required = parseInt(match[2], 10);

  return {
    attendedDays: Number.isFinite(attended) ? attended : 0,
    requiredDays: Number.isFinite(required) ? required : 0,
  };
}

export function generateMultipleCommentOptions(averageScore: number): string[] {
  const baseComment = generateAutoComment(averageScore);
  const options: string[] = [baseComment];
  
  if (averageScore >= 90) {
    options.push('Excellent performance and outstanding achievement');
    options.push('Excellent work, maintain this standard');
  } else if (averageScore >= 80) {
    options.push('A very good result, keep pushing for excellence');
    options.push('A very good result with room for improvement');
  } else if (averageScore >= 70) {
    options.push('Good result, more effort needed for excellence');
    options.push('Good result, continue working hard');
  } else if (averageScore >= 60) {
    options.push('A satisfaction result, improvement is possible');
    options.push('A satisfaction result, put in more effort');
  } else if (averageScore >= 50) {
    options.push('A fair result, significant improvement needed');
    options.push('A fair result, must work harder');
  } else {
    options.push('Fail, but serious improvement required');
    options.push('Fail, needs dedicated effort');
  }
  
  return options.slice(0, 5);
}

export function generatePrincipalComment(averageScore: number): string {
  if (averageScore >= 80) {
    return "Exceptional performance! Keep up the excellent work. You are a role model for others.";
  } else if (averageScore >= 70) {
    return "Very good performance! Continue to work hard and aim for excellence.";
  } else if (averageScore >= 60) {
    return "Good performance! There is room for improvement. Stay focused and dedicated.";
  } else if (averageScore >= 50) {
    return "Fair performance. More effort and dedication needed for better results.";
  } else {
    return "Poor performance. Requires immediate attention and significant improvement.";
  }
}
