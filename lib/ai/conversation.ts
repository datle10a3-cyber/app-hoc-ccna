type Turn = { role: 'user' | 'assistant'; content: string };

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
}

/** Add the previous topic to retrieval only when the new request actually refers to it. */
export function retrievalQuery(question: string, history: Turn[]): string {
  const current = normalize(question);
  const genericFollowUp = /^(?:giai thich(?: ky| ro| chi tiet)? hon|noi ro hon|noi ky hon|toi chua hieu|khong hieu|lap bang(?: ra| di)?|tao bang(?: ra| di)?|chuyen(?: no| cau tra loi)? thanh bang|viet lai(?: ngan gon| de hieu)?|rut gon(?: lai)?|tiep tuc|tai sao|vi sao)[?!. ]*$/.test(current);
  const referencesPrevious = /\b(?:cai do|cai nay|lenh do|lenh nay|port do|cong do|phan do|o tren|ben tren|vua noi|truoc do|cau truoc|no|chung|nhung lenh do)\b/.test(current);
  if (!genericFollowUp && !referencesPrevious) return question;

  const previousQuestion = [...history].reverse().find(turn => turn.role === 'user')?.content;
  if (!previousQuestion) return question;
  const previousAnswer = [...history].reverse().find(turn => turn.role === 'assistant')?.content || '';
  const answerContext = previousAnswer.length > 1600
    ? `${previousAnswer.slice(0, 800)} ${previousAnswer.slice(-800)}`
    : previousAnswer;
  return `${previousQuestion} ${answerContext} ${question}`;
}
