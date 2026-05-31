export const CLASSROOM_TOOLS = [
  {
    name: 'classroom_list_courses',
    description: 'List Google Classroom courses visible to the signed-in user.',
    category: 'classroom',
    parameters: {
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum courses to return (default: 25, max: 100).',
      },
      course_states: {
        type: 'string',
        required: false,
        description: 'Comma-separated course states, such as ACTIVE,ARCHIVED.',
      },
      teacher_id: {
        type: 'string',
        required: false,
        description: 'Optional teacher ID or me to filter courses.',
      },
      student_id: {
        type: 'string',
        required: false,
        description: 'Optional student ID or me to filter courses.',
      },
    },
  },
  {
    name: 'classroom_get_course',
    description: 'Get a Google Classroom course by course ID.',
    category: 'classroom',
    parameters: {
      course_id: { type: 'string', required: true, description: 'Google Classroom course ID.' },
    },
  },
  {
    name: 'classroom_list_coursework',
    description: 'List assignments and questions for a Google Classroom course.',
    category: 'classroom',
    parameters: {
      course_id: { type: 'string', required: true, description: 'Google Classroom course ID.' },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum coursework items to return (default: 25, max: 100).',
      },
      course_work_states: {
        type: 'string',
        required: false,
        description: 'Comma-separated coursework states, such as PUBLISHED,DRAFT.',
      },
    },
  },
  {
    name: 'classroom_list_course_materials',
    description: 'List materials for a Google Classroom course.',
    category: 'classroom',
    parameters: {
      course_id: { type: 'string', required: true, description: 'Google Classroom course ID.' },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum materials to return (default: 25, max: 100).',
      },
    },
  },
  {
    name: 'classroom_list_students',
    description: 'List students enrolled in a Google Classroom course.',
    category: 'classroom',
    parameters: {
      course_id: { type: 'string', required: true, description: 'Google Classroom course ID.' },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum students to return (default: 25, max: 100).',
      },
    },
  },
  {
    name: 'classroom_list_teachers',
    description: 'List teachers for a Google Classroom course.',
    category: 'classroom',
    parameters: {
      course_id: { type: 'string', required: true, description: 'Google Classroom course ID.' },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum teachers to return (default: 25, max: 100).',
      },
    },
  },
  {
    name: 'classroom_list_submissions',
    description: 'List student submissions for a Google Classroom coursework item.',
    category: 'classroom',
    parameters: {
      course_id: { type: 'string', required: true, description: 'Google Classroom course ID.' },
      course_work_id: {
        type: 'string',
        required: true,
        description: 'Coursework ID from classroom_list_coursework.',
      },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum submissions to return (default: 25, max: 100).',
      },
      states: {
        type: 'string',
        required: false,
        description: 'Comma-separated submission states, such as TURNED_IN,RETURNED.',
      },
    },
  },
];
