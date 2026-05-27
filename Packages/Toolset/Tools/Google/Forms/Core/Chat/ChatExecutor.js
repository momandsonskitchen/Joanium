import * as FormsAPI from '../API/FormsAPI.js';
import { requireGoogleCredentials } from '../../../Common.js';
import { formatDate, typeLabel, csvEscape, median } from './Utils.js';

const NON_ANSWER_QUESTION_TYPES = ['PAGE_BREAK', 'SECTION_TEXT', 'IMAGE', 'VIDEO'];

function requireFormId(params) {
  const formId = params.form_id;
  if (!formId?.trim()) throw new Error('Missing required param: form_id');
  return formId.trim();
}

function isAnswerQuestion(question) {
  return !NON_ANSWER_QUESTION_TYPES.includes(question.type);
}

function answerQuestions(form) {
  return FormsAPI.extractQuestions(form).filter((question) => isAnswerQuestion(question));
}

function answerQuestionsWithIds(form) {
  return answerQuestions(form).filter((question) => question.questionId);
}

async function loadFormAndResponses(credentials, formId, maxResults) {
  const [form, responseData] = await Promise.all([
    FormsAPI.getForm(credentials, formId),
    FormsAPI.listResponses(credentials, formId, { maxResults: maxResults }),
  ]);
  return { form: form, ...responseData };
}

async function loadFormAndResponseCount(credentials, formId) {
  return loadFormAndResponses(credentials, formId, 1);
}

async function loadQuestionResponses(credentials, params, defaultMaxResults) {
  const { question_id: questionId, max_results: maxResults = defaultMaxResults } = params,
    formId = requireFormId(params);
  if (!questionId?.trim()) throw new Error('Missing required param: question_id');
  const { form, responses } = await loadFormAndResponses(credentials, formId, maxResults),
    question = answerQuestions(form).find((q) => q.questionId === questionId.trim());
  return { form: form, responses: responses, question: question, questionId: questionId.trim() };
}

function buildQuestionTitleMap(form) {
  return Object.fromEntries(
    FormsAPI.extractQuestions(form)
      .filter((q) => q.questionId)
      .map((q) => [q.questionId, q.title || '(Untitled)']),
  );
}

function formatResponseAnswerLines(response, questionMap) {
  return Object.entries(response.answers ?? {}).map(
    ([qId, answer]) =>
      `  Q: ${questionMap[qId] ?? qId}\n  A: ${FormsAPI.extractAnswerValue(answer)}`,
  );
}

function appendResponseAnswers(lines, response, questionMap) {
  for (const [qId, answer] of Object.entries(response.answers ?? {})) {
    lines.push(`\nQ: ${questionMap[qId] ?? qId}`);
    lines.push(`A: ${FormsAPI.extractAnswerValue(answer)}`);
  }
}

function formatResponseSection(response, label, questionMap, { includeEmail = true } = {}) {
  return [
    [
      label,
      response.createTime ? `  Submitted: ${formatDate(response.createTime)}` : '',
      includeEmail && response.respondentEmail ? `  Respondent: ${response.respondentEmail}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    ...formatResponseAnswerLines(response, questionMap),
  ].join('\n');
}

export async function executeFormsChatTool(ctx, toolName, params = {}) {
  const credentials = requireGoogleCredentials(ctx);
  switch (toolName) {
    case 'forms_get_form': {
      const formId = requireFormId(params);
      const form = await FormsAPI.getForm(credentials, formId),
        questions = FormsAPI.extractQuestions(form),
        questionItems = questions.filter((q) => isAnswerQuestion(q)),
        lines = [
          `**${form.info?.title ?? 'Untitled Form'}**`,
          form.info?.description ? `Description: ${form.info.description}` : '',
          `Form ID: \`${form.formId}\``,
          `Link: ${form.responderUri ?? `https://docs.google.com/forms/d/${form.formId}/viewform`}`,
          `Questions: ${questionItems.length}`,
          '',
          '── Questions ──',
        ];
      return (
        questions.forEach((q, i) => {
          if (['PAGE_BREAK', 'SECTION_TEXT'].includes(q.type))
            return void lines.push(`\n— ${q.title || 'Section'} —`);
          if (['IMAGE', 'VIDEO'].includes(q.type)) return;
          const reqFlag = q.required ? ' *(required)*' : '';
          (lines.push(`\n${i + 1}. **${q.title || '(Untitled question)'}**${reqFlag}`),
            lines.push(`   Type: ${typeLabel(q.type)}`),
            q.description && lines.push(`   Description: ${q.description}`),
            q.options?.length && lines.push(`   Options: ${q.options.join(' · ')}`),
            q.scale && lines.push(`   Scale: ${q.scale.low} – ${q.scale.high}`),
            q.questionId && lines.push(`   Question ID: \`${q.questionId}\``));
        }),
        lines.filter((v) => null != v).join('\n')
      );
    }
    case 'forms_get_summary': {
      const formId = requireFormId(params);
      const { form, totalResponses } = await loadFormAndResponseCount(credentials, formId),
        answerableCount = answerQuestions(form).length;
      return [
        `**${form.info?.title ?? 'Untitled Form'}**`,
        form.info?.description ? `Description: ${form.info.description}` : '',
        '',
        `Form ID: \`${form.formId}\``,
        `Responder link: ${form.responderUri ?? `https://docs.google.com/forms/d/${form.formId}/viewform`}`,
        `Edit link: https://docs.google.com/forms/d/${form.formId}/edit`,
        '',
        `Total questions: ${answerableCount}`,
        `Total responses: ${totalResponses}`,
        form.settings?.quizSettings ? 'Type: Quiz' : 'Type: Form',
        form.settings?.quizSettings?.isQuiz ? 'Points possible: tracked' : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'forms_list_responses': {
      const { form_id: form_id, max_results: max_results = 50 } = params;
      const formId = requireFormId(params);
      const { form, responses, totalResponses } = await loadFormAndResponses(
        credentials,
        formId,
        max_results,
      );
      if (!responses.length) return `No responses found for form "${form.info?.title ?? form_id}".`;
      const qMap = buildQuestionTitleMap(form),
        sections = responses.map((resp, i) =>
          formatResponseSection(
            resp,
            `Response ${i + 1}\n  Response ID: \`${resp.responseId}\``,
            qMap,
          ),
        );
      return [
        `**${form.info?.title ?? 'Form'}** — ${responses.length} of ${totalResponses} response(s)`,
        '',
        sections.join('\n\n── ── ──\n\n'),
      ].join('\n');
    }
    case 'forms_get_response': {
      const { response_id: response_id } = params;
      const formId = requireFormId(params);
      if (!response_id?.trim()) throw new Error('Missing required param: response_id');
      const [form, resp] = await Promise.all([
          FormsAPI.getForm(credentials, formId),
          FormsAPI.getResponse(credentials, formId, response_id.trim()),
        ]),
        qMap = buildQuestionTitleMap(form),
        lines = [
          `Response \`${resp.responseId}\``,
          resp.createTime ? `Submitted: ${formatDate(resp.createTime)}` : '',
          resp.respondentEmail ? `Respondent: ${resp.respondentEmail}` : '',
          null != resp.totalScore ? `Score: ${resp.totalScore}` : '',
          '',
          '── Answers ──',
        ];
      for (const [qId, answer] of Object.entries(resp.answers ?? {})) {
        const qTitle = qMap[qId] ?? qId,
          value = FormsAPI.extractAnswerValue(answer);
        (lines.push(`\nQ: ${qTitle}`),
          lines.push(`A: ${value}`),
          answer.grade &&
            (lines.push(
              `   Score: ${answer.grade.score ?? 0} / ${answer.grade.questionScore?.maxPoints ?? '?'}`,
            ),
            void 0 !== answer.grade.correct &&
              lines.push('   Correct: ' + (answer.grade.correct ? 'Yes' : 'No'))));
      }
      return lines.filter(Boolean).join('\n');
    }
    case 'forms_get_response_count': {
      const formId = requireFormId(params);
      const { form, totalResponses } = await loadFormAndResponseCount(credentials, formId);
      return `**${form.info?.title ?? 'Untitled Form'}** has **${totalResponses}** response(s).`;
    }
    case 'forms_get_latest_response': {
      const formId = requireFormId(params);
      const { form, responses } = await loadFormAndResponses(credentials, formId, 5e3);
      if (!responses.length) return `No responses found for form "${form.info?.title ?? formId}".`;
      const latest = [...responses].sort(
          (a, b) => new Date(b.createTime) - new Date(a.createTime),
        )[0],
        qMap = buildQuestionTitleMap(form),
        lines = [
          `**Most recent response** for "${form.info?.title ?? formId}"`,
          `Response ID: \`${latest.responseId}\``,
          latest.createTime ? `Submitted: ${formatDate(latest.createTime)}` : '',
          latest.respondentEmail ? `Respondent: ${latest.respondentEmail}` : '',
          '',
          '── Answers ──',
        ];
      appendResponseAnswers(lines, latest, qMap);
      return lines.filter(Boolean).join('\n');
    }
    case 'forms_get_first_response': {
      const formId = requireFormId(params);
      const { form, responses } = await loadFormAndResponses(credentials, formId, 5e3);
      if (!responses.length) return `No responses found for form "${form.info?.title ?? formId}".`;
      const first = [...responses].sort(
          (a, b) => new Date(a.createTime) - new Date(b.createTime),
        )[0],
        qMap = buildQuestionTitleMap(form),
        lines = [
          `**First response** for "${form.info?.title ?? formId}"`,
          `Response ID: \`${first.responseId}\``,
          first.createTime ? `Submitted: ${formatDate(first.createTime)}` : '',
          first.respondentEmail ? `Respondent: ${first.respondentEmail}` : '',
          '',
          '── Answers ──',
        ];
      appendResponseAnswers(lines, first, qMap);
      return lines.filter(Boolean).join('\n');
    }
    case 'forms_get_responses_in_range': {
      const { start_date: start_date, end_date: end_date, max_results: max_results = 50 } = params;
      const formId = requireFormId(params);
      if (!start_date?.trim()) throw new Error('Missing required param: start_date');
      if (!end_date?.trim()) throw new Error('Missing required param: end_date');
      const start = new Date(start_date),
        end = new Date(end_date);
      if (isNaN(start) || isNaN(end)) throw new Error('Invalid date format. Use ISO 8601.');
      const { form, responses, totalResponses } = await loadFormAndResponses(
          credentials,
          formId,
          5e3,
        ),
        filtered = responses
          .filter((r) => {
            const t = new Date(r.createTime);
            return t >= start && t <= end;
          })
          .slice(0, max_results);
      if (!filtered.length)
        return `No responses found between ${formatDate(start_date)} and ${formatDate(end_date)}.`;
      const qMap = buildQuestionTitleMap(form),
        sections = filtered.map((resp, i) =>
          formatResponseSection(resp, `Response ${i + 1} - \`${resp.responseId}\``, qMap),
        );
      return [
        `**${form.info?.title ?? 'Form'}** — ${filtered.length} response(s) between ${formatDate(start_date)} and ${formatDate(end_date)} (out of ${totalResponses} total)`,
        '',
        sections.join('\n\n── ── ──\n\n'),
      ].join('\n');
    }
    case 'forms_find_responses_by_email': {
      const { form_id: form_id, email: email } = params;
      const formId = requireFormId(params);
      if (!email?.trim()) throw new Error('Missing required param: email');
      const { form, responses } = await loadFormAndResponses(credentials, formId, 5e3),
        needle = email.trim().toLowerCase(),
        matched = responses.filter((r) => r.respondentEmail?.toLowerCase() === needle);
      if (!matched.length)
        return `No responses found from "${email}" in form "${form.info?.title ?? form_id}".`;
      const qMap = buildQuestionTitleMap(form),
        sections = matched.map((resp, i) =>
          formatResponseSection(resp, `Response ${i + 1} - \`${resp.responseId}\``, qMap, {
            includeEmail: false,
          }),
        );
      return [
        `**${matched.length} response(s)** from ${email} in "${form.info?.title ?? form_id}"`,
        '',
        sections.join('\n\n── ── ──\n\n'),
      ].join('\n');
    }
    case 'forms_search_responses': {
      const { form_id: form_id, keyword: keyword, max_results: max_results = 200 } = params;
      const formId = requireFormId(params);
      if (!keyword?.trim()) throw new Error('Missing required param: keyword');
      const { form, responses } = await loadFormAndResponses(credentials, formId, max_results),
        needle = keyword.trim().toLowerCase(),
        qMap = buildQuestionTitleMap(form),
        matched = responses.filter((resp) =>
          Object.values(resp.answers ?? {}).some((answer) =>
            FormsAPI.extractAnswerValue(answer).toLowerCase().includes(needle),
          ),
        );
      if (!matched.length)
        return `No responses containing "${keyword}" found in form "${form.info?.title ?? form_id}".`;
      const sections = matched.map((resp, i) =>
        [
          [
            `Match ${i + 1} — \`${resp.responseId}\``,
            resp.createTime ? `  Submitted: ${formatDate(resp.createTime)}` : '',
            resp.respondentEmail ? `  Respondent: ${resp.respondentEmail}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          ...Object.entries(resp.answers ?? {}).map(([qId, answer]) => {
            const val = FormsAPI.extractAnswerValue(answer),
              highlight = val.toLowerCase().includes(needle) ? ' ◄' : '';
            return `  Q: ${qMap[qId] ?? qId}\n  A: ${val}${highlight}`;
          }),
        ].join('\n'),
      );
      return [
        `**${matched.length} response(s)** containing "${keyword}" in "${form.info?.title ?? form_id}"`,
        '',
        sections.join('\n\n── ── ──\n\n'),
      ].join('\n');
    }
    case 'forms_list_questions': {
      const formId = requireFormId(params);
      const form = await FormsAPI.getForm(credentials, formId),
        questions = FormsAPI.extractQuestions(form),
        lines = [`**${form.info?.title ?? 'Untitled Form'}** — Questions`, ''];
      let qNum = 0;
      for (const q of questions) {
        if (['PAGE_BREAK', 'SECTION_TEXT'].includes(q.type)) {
          lines.push(`\n— ${q.title || 'Section'} —`);
          continue;
        }
        if (['IMAGE', 'VIDEO'].includes(q.type)) continue;
        qNum++;
        const reqFlag = q.required ? ' *(required)*' : '';
        (lines.push(`${qNum}. **${q.title || '(Untitled)'}**${reqFlag} — ${typeLabel(q.type)}`),
          q.options?.length && lines.push(`   Options: ${q.options.join(' · ')}`),
          q.scale && lines.push(`   Scale: ${q.scale.low} – ${q.scale.high}`),
          q.questionId && lines.push(`   ID: \`${q.questionId}\``));
      }
      return lines.join('\n');
    }
    case 'forms_get_question_by_title': {
      const { title_query: title_query } = params;
      const formId = requireFormId(params);
      if (!title_query?.trim()) throw new Error('Missing required param: title_query');
      const form = await FormsAPI.getForm(credentials, formId),
        questions = FormsAPI.extractQuestions(form),
        needle = title_query.trim().toLowerCase(),
        matches = questions.filter((q) => q.title?.toLowerCase().includes(needle));
      if (!matches.length)
        return `No questions matching "${title_query}" found in form "${form.info?.title ?? formId}".`;
      const lines = [
        `**${matches.length} question(s)** matching "${title_query}" in "${form.info?.title ?? formId}"`,
        '',
      ];
      return (
        matches.forEach((q, i) => {
          (lines.push(`${i + 1}. **${q.title}**`),
            lines.push(`   Type: ${typeLabel(q.type)}`),
            lines.push('   Required: ' + (q.required ? 'Yes' : 'No')),
            q.description && lines.push(`   Description: ${q.description}`),
            q.options?.length && lines.push(`   Options: ${q.options.join(' · ')}`),
            q.scale && lines.push(`   Scale: ${q.scale.low} – ${q.scale.high}`),
            q.questionId && lines.push(`   Question ID: \`${q.questionId}\``),
            lines.push(''));
        }),
        lines.join('\n')
      );
    }
    case 'forms_count_answers_for_question': {
      const { responses, question, questionId } = await loadQuestionResponses(
        credentials,
        params,
        500,
      );
      if (!question) throw new Error(`Question ID "${questionId}" not found in this form.`);
      const counts = {};
      let answered = 0;
      for (const resp of responses) {
        const answer = resp.answers?.[questionId];
        if (!answer) continue;
        const value = FormsAPI.extractAnswerValue(answer);
        if ('(no answer)' !== value) {
          answered++;
          for (const choice of value.split(', ')) counts[choice] = (counts[choice] ?? 0) + 1;
        }
      }
      if (!answered)
        return `No answers recorded for question "${question.title}" across ${responses.length} response(s).`;
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]),
        lines = [
          `**"${question.title}"** — Answer breakdown (${answered} of ${responses.length} responded)`,
          '',
        ];
      for (const [option, count] of sorted) {
        const pct = ((count / answered) * 100).toFixed(1),
          bar = '█'.repeat(Math.round((count / answered) * 20));
        (lines.push(`${option}`), lines.push(`  ${bar} ${count} (${pct}%)`));
      }
      return lines.join('\n');
    }
    case 'forms_analyze_scale_question': {
      const { responses, question, questionId } = await loadQuestionResponses(
        credentials,
        params,
        500,
      );
      if (!question) throw new Error(`Question ID "${questionId}" not found in this form.`);
      const values = [];
      for (const resp of responses) {
        const answer = resp.answers?.[questionId];
        if (!answer) continue;
        const raw = FormsAPI.extractAnswerValue(answer),
          num = parseFloat(raw);
        isNaN(num) || values.push(num);
      }
      if (!values.length) return `No numeric answers found for question "${question.title}".`;
      const sorted = [...values].sort((a, b) => a - b),
        avg = values.reduce((s, v) => s + v, 0) / values.length,
        med = median(sorted),
        min = sorted[0],
        max = sorted[sorted.length - 1],
        dist = {};
      for (const v of values) dist[v] = (dist[v] ?? 0) + 1;
      const lines = [
        `**"${question.title}"** — Scale analysis (${values.length} response(s))`,
        '',
        `Average:  ${avg.toFixed(2)}`,
        `Median:   ${med}`,
        `Min:      ${min}`,
        `Max:      ${max}`,
        '',
        '── Distribution ──',
      ];
      for (const [score, count] of Object.entries(dist).sort(
        (a, b) => Number(a[0]) - Number(b[0]),
      )) {
        const pct = ((count / values.length) * 100).toFixed(1),
          bar = '█'.repeat(Math.round((count / values.length) * 20));
        lines.push(`${score}: ${bar} ${count} (${pct}%)`);
      }
      return lines.join('\n');
    }
    case 'forms_collect_text_answers': {
      const { responses, question, questionId } = await loadQuestionResponses(
        credentials,
        params,
        100,
      );
      if (!question) throw new Error(`Question ID "${questionId}" not found.`);
      const answers = [];
      for (const resp of responses) {
        const answer = resp.answers?.[questionId],
          value = FormsAPI.extractAnswerValue(answer);
        value &&
          '(no answer)' !== value &&
          answers.push({ value: value, submitted: resp.createTime, email: resp.respondentEmail });
      }
      if (!answers.length) return `No text answers found for question "${question.title}".`;
      const lines = [`**"${question.title}"** — ${answers.length} text answer(s)`, ''];
      return (
        answers.forEach((a, i) => {
          const meta = [a.submitted ? formatDate(a.submitted) : '', a.email ? a.email : '']
            .filter(Boolean)
            .join(' · ');
          lines.push(`${i + 1}. ${a.value}${meta ? `\n   _(${meta})_` : ''}`);
        }),
        lines.join('\n')
      );
    }
    case 'forms_get_top_answers': {
      const { top_n: top_n = 5 } = params,
        { responses, question, questionId } = await loadQuestionResponses(credentials, params, 500);
      if (!question) throw new Error(`Question ID "${questionId}" not found.`);
      const counts = {};
      let total = 0;
      for (const resp of responses) {
        const answer = resp.answers?.[questionId],
          value = FormsAPI.extractAnswerValue(answer);
        if (value && '(no answer)' !== value) {
          total++;
          for (const choice of value.split(', ')) counts[choice] = (counts[choice] ?? 0) + 1;
        }
      }
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, top_n);
      if (!sorted.length) return `No answers found for question "${question.title}".`;
      const lines = [
        `**Top ${sorted.length} answer(s)** for "${question.title}" (${total} response(s))`,
        '',
      ];
      return (
        sorted.forEach(([val, count], i) => {
          const pct = ((count / total) * 100).toFixed(1);
          lines.push(`${i + 1}. ${val} — ${count} (${pct}%)`);
        }),
        lines.join('\n')
      );
    }
    case 'forms_get_unanswered_count': {
      const { form_id: form_id, max_results: max_results = 200 } = params;
      const formId = requireFormId(params);
      const { form, responses } = await loadFormAndResponses(credentials, formId, max_results),
        questions = answerQuestionsWithIds(form),
        total = responses.length;
      if (!total) return `No responses found for form "${form.info?.title ?? form_id}".`;
      const lines = [
        `**"${form.info?.title ?? form_id}"** — Skipped questions (${total} response(s))`,
        '',
      ];
      for (const q of questions) {
        const skipped =
            total -
            responses.filter((r) => {
              const val = FormsAPI.extractAnswerValue(r.answers?.[q.questionId]);
              return val && '(no answer)' !== val;
            }).length,
          pct = ((skipped / total) * 100).toFixed(1);
        lines.push(`• **${q.title || '(Untitled)'}**: ${skipped} skipped (${pct}%)`);
      }
      return lines.join('\n');
    }
    case 'forms_get_score_summary': {
      const { form_id: form_id, max_results: max_results = 200 } = params;
      const formId = requireFormId(params);
      const { form, responses } = await loadFormAndResponses(credentials, formId, max_results),
        scoredResponses = responses.filter((r) => null != r.totalScore);
      if (!scoredResponses.length)
        return `No quiz scores found. Make sure "${form.info?.title ?? form_id}" is a quiz with graded responses.`;
      const scores = scoredResponses.map((r) => r.totalScore).sort((a, b) => a - b),
        avg = scores.reduce((s, v) => s + v, 0) / scores.length,
        med = median(scores),
        dist = {};
      for (const s of scores) dist[s] = (dist[s] ?? 0) + 1;
      const lines = [
        `**"${form.info?.title ?? 'Quiz'}"** — Score summary (${scoredResponses.length} graded response(s))`,
        '',
        `Average score: ${avg.toFixed(2)}`,
        `Median score:  ${med}`,
        `Highest score: ${scores[scores.length - 1]}`,
        `Lowest score:  ${scores[0]}`,
        '',
        '── Score distribution ──',
      ];
      for (const [score, count] of Object.entries(dist).sort(
        (a, b) => Number(a[0]) - Number(b[0]),
      )) {
        const bar = '█'.repeat(Math.min(count, 30));
        lines.push(`${String(score).padStart(4)}: ${bar} (${count})`);
      }
      return lines.join('\n');
    }
    case 'forms_get_quiz_leaderboard': {
      const { form_id: form_id, top_n: top_n = 10, max_results: max_results = 200 } = params;
      const formId = requireFormId(params);
      const { form, responses } = await loadFormAndResponses(credentials, formId, max_results),
        scoredResponses = responses
          .filter((r) => null != r.totalScore)
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, top_n);
      if (!scoredResponses.length)
        return `No quiz scores found for "${form.info?.title ?? form_id}".`;
      const lines = [
        `**"${form.info?.title ?? 'Quiz'}"** — Top ${scoredResponses.length} score(s)`,
        '',
      ];
      return (
        scoredResponses.forEach((resp, i) => {
          const name = resp.respondentEmail ?? `Anonymous (${resp.responseId.slice(0, 8)})`,
            submitted = resp.createTime ? ` — ${formatDate(resp.createTime)}` : '';
          lines.push(`${i + 1}. **${resp.totalScore}** pts — ${name}${submitted}`);
        }),
        lines.join('\n')
      );
    }
    case 'forms_get_respondent_list': {
      const { form_id: form_id, max_results: max_results = 200 } = params;
      const formId = requireFormId(params);
      const { form, responses, totalResponses } = await loadFormAndResponses(
          credentials,
          formId,
          max_results,
        ),
        withEmail = responses.filter((r) => r.respondentEmail);
      if (!withEmail.length)
        return 'No respondent emails found. The form may not be collecting email addresses, or no responses have been submitted yet.';
      const lines = [
        `**"${form.info?.title ?? form_id}"** — ${withEmail.length} respondent(s) (showing ${withEmail.length} of ${totalResponses} total)`,
        '',
      ];
      return (
        withEmail.forEach((resp, i) => {
          const submitted = resp.createTime ? formatDate(resp.createTime) : 'unknown';
          lines.push(`${i + 1}. ${resp.respondentEmail} — submitted ${submitted}`);
        }),
        lines.join('\n')
      );
    }
    case 'forms_compare_responses': {
      const {
        form_id: form_id,
        response_id_a: response_id_a,
        response_id_b: response_id_b,
      } = params;
      const formId = requireFormId(params);
      if (!response_id_a?.trim()) throw new Error('Missing required param: response_id_a');
      if (!response_id_b?.trim()) throw new Error('Missing required param: response_id_b');
      const [form, respA, respB] = await Promise.all([
          FormsAPI.getForm(credentials, formId),
          FormsAPI.getResponse(credentials, formId, response_id_a.trim()),
          FormsAPI.getResponse(credentials, formId, response_id_b.trim()),
        ]),
        questions = answerQuestionsWithIds(form),
        labelA = respA.respondentEmail ?? `Response A (${respA.responseId.slice(0, 8)})`,
        labelB = respB.respondentEmail ?? `Response B (${respB.responseId.slice(0, 8)})`,
        lines = [
          `**Comparison** in "${form.info?.title ?? form_id}"`,
          `A: ${labelA}${respA.createTime ? ` — ${formatDate(respA.createTime)}` : ''}`,
          `B: ${labelB}${respB.createTime ? ` — ${formatDate(respB.createTime)}` : ''}`,
          '',
        ];
      for (const q of questions) {
        const valA = FormsAPI.extractAnswerValue(respA.answers?.[q.questionId]),
          valB = FormsAPI.extractAnswerValue(respB.answers?.[q.questionId]),
          same = valA === valB;
        (lines.push(`**${q.title || '(Untitled)'}**${same ? ' ✓' : ''}`),
          lines.push(`  A: ${valA}`),
          lines.push(`  B: ${valB}`),
          lines.push(''));
      }
      return lines.join('\n');
    }
    case 'forms_export_csv': {
      const { form_id: form_id, max_results: max_results = 200 } = params;
      const formId = requireFormId(params);
      const { form, responses, totalResponses } = await loadFormAndResponses(
        credentials,
        formId,
        max_results,
      );
      if (!responses.length) return `No responses found for form "${form.info?.title ?? form_id}".`;
      const questions = answerQuestionsWithIds(form),
        rows = [
          [
            'Response ID',
            'Submitted',
            'Respondent Email',
            ...questions.map((q) => q.title || q.questionId),
          ]
            .map(csvEscape)
            .join(','),
        ];
      for (const resp of responses) {
        const cols = [
          resp.responseId,
          resp.createTime ? new Date(resp.createTime).toISOString() : '',
          resp.respondentEmail ?? '',
          ...questions.map((q) => FormsAPI.extractAnswerValue(resp.answers?.[q.questionId])),
        ];
        rows.push(cols.map(csvEscape).join(','));
      }
      const csv = rows.join('\n');
      return [
        `**CSV export** for "${form.info?.title ?? form_id}" — ${responses.length} of ${totalResponses} response(s)`,
        '',
        '```csv',
        csv,
        '```',
      ].join('\n');
    }
    case 'forms_get_form_settings': {
      const formId = requireFormId(params);
      const form = await FormsAPI.getForm(credentials, formId),
        s = form.settings ?? {},
        quiz = s.quizSettings,
        lines = [
          `**Settings** for "${form.info?.title ?? formId}"`,
          '',
          `Form ID: \`${form.formId}\``,
          `Responder link: ${form.responderUri ?? `https://docs.google.com/forms/d/${form.formId}/viewform`}`,
          '',
          '── General ──',
          'Collect email: ' +
            ('VERIFIED' === s.emailCollectionType
              ? 'Yes (verified)'
              : 'RESPONDENT_INPUT' === s.emailCollectionType
                ? 'Yes (self-reported)'
                : 'No'),
          'Login required: ' + (s.requireLogin ? 'Yes' : 'No'),
          'Limit to one response: ' + (s.limitOneResponsePerUser ? 'Yes' : 'No'),
          'Allow response editing: ' + (s.canEditAfterSubmit ? 'Yes' : 'No'),
          'Show summary to respondents: ' + (s.publishSummary ? 'Yes' : 'No'),
          '',
          quiz ? '── Quiz settings ──' : 'Type: Regular form (not a quiz)',
        ];
      return (
        quiz &&
          (lines.push('Is quiz: ' + (quiz.isQuiz ? 'Yes' : 'No')),
          quiz.isQuiz &&
            (lines.push(`Release grade: ${quiz.gradeSettings?.whenToGrade ?? 'Unknown'}`),
            lines.push(
              `Show correct answers: ${quiz.gradeSettings?.correctAnswersVisibility ?? 'Unknown'}`,
            ),
            lines.push(
              `Show point values: ${quiz.gradeSettings?.pointValueVisibility ?? 'Unknown'}`,
            ))),
        form.info?.documentTitle &&
          (lines.push(''), lines.push(`Document title: ${form.info.documentTitle}`)),
        lines.filter(Boolean).join('\n')
      );
    }
    case 'forms_get_completion_rate': {
      const { form_id: form_id, max_results: max_results = 200 } = params;
      const formId = requireFormId(params);
      const { form, responses, totalResponses } = await loadFormAndResponses(
          credentials,
          formId,
          max_results,
        ),
        questions = answerQuestionsWithIds(form),
        total = responses.length;
      if (!total) return `No responses found for form "${form.info?.title ?? form_id}".`;
      const lines = [
        `**Completion rate** for "${form.info?.title ?? form_id}" (${total} response(s) analyzed of ${totalResponses} total)`,
        '',
      ];
      for (const q of questions) {
        const answered = responses.filter((r) => {
            const val = FormsAPI.extractAnswerValue(r.answers?.[q.questionId]);
            return val && '(no answer)' !== val;
          }).length,
          pct = ((answered / total) * 100).toFixed(1),
          bar = '█'.repeat(Math.round((answered / total) * 20)),
          reqFlag = q.required ? ' *(required)*' : '';
        (lines.push(`**${q.title || '(Untitled)'}**${reqFlag}`),
          lines.push(`  ${bar} ${answered}/${total} answered (${pct}%)`));
      }
      return lines.join('\n');
    }
    default:
      throw new Error(`Unknown Forms tool: ${toolName}`);
  }
}
