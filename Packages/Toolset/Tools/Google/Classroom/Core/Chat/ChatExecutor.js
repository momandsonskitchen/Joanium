import * as ClassroomAPI from '../API/ClassroomAPI.js';
import { requireGoogleCredentials } from '../../../Common.js';
import {
  formatCourse,
  formatCourseMaterial,
  formatCourseWork,
  formatPerson,
  formatSubmission,
  requireParam,
} from './Utils.js';

export async function executeClassroomChatTool(ctx, toolName, params = {}) {
  const credentials = requireGoogleCredentials(ctx);

  switch (toolName) {
    case 'classroom_list_courses': {
      const courses = await ClassroomAPI.listCourses(credentials, {
        maxResults: params.max_results ?? 25,
        courseStates: params.course_states?.trim() ?? '',
        teacherId: params.teacher_id?.trim() ?? '',
        studentId: params.student_id?.trim() ?? '',
      });

      return courses.length
        ? `Google Classroom courses (${courses.length}):\n\n${courses
            .map((course, index) => formatCourse(course, index + 1))
            .join('\n\n')}`
        : 'No Google Classroom courses found.';
    }

    case 'classroom_get_course': {
      const course = await ClassroomAPI.getCourse(credentials, requireParam(params, 'course_id'));
      return formatCourse(course);
    }

    case 'classroom_list_coursework': {
      const courseId = requireParam(params, 'course_id');
      const items = await ClassroomAPI.listCourseWork(credentials, courseId, {
        maxResults: params.max_results ?? 25,
        courseWorkStates: params.course_work_states?.trim() ?? '',
      });

      return items.length
        ? `Google Classroom coursework (${items.length}):\n\n${items
            .map((item, index) => formatCourseWork(item, index + 1))
            .join('\n\n')}`
        : `No coursework found for course \`${courseId}\`.`;
    }

    case 'classroom_list_course_materials': {
      const courseId = requireParam(params, 'course_id');
      const materials = await ClassroomAPI.listCourseWorkMaterials(credentials, courseId, {
        maxResults: params.max_results ?? 25,
      });

      return materials.length
        ? `Google Classroom materials (${materials.length}):\n\n${materials
            .map((material, index) => formatCourseMaterial(material, index + 1))
            .join('\n\n')}`
        : `No materials found for course \`${courseId}\`.`;
    }

    case 'classroom_list_students': {
      const courseId = requireParam(params, 'course_id');
      const students = await ClassroomAPI.listStudents(credentials, courseId, {
        maxResults: params.max_results ?? 25,
      });

      return students.length
        ? `Google Classroom students (${students.length}):\n\n${students
            .map((student, index) => formatPerson(student, index + 1))
            .join('\n\n')}`
        : `No students found for course \`${courseId}\`.`;
    }

    case 'classroom_list_teachers': {
      const courseId = requireParam(params, 'course_id');
      const teachers = await ClassroomAPI.listTeachers(credentials, courseId, {
        maxResults: params.max_results ?? 25,
      });

      return teachers.length
        ? `Google Classroom teachers (${teachers.length}):\n\n${teachers
            .map((teacher, index) => formatPerson(teacher, index + 1))
            .join('\n\n')}`
        : `No teachers found for course \`${courseId}\`.`;
    }

    case 'classroom_list_submissions': {
      const courseId = requireParam(params, 'course_id');
      const courseWorkId = requireParam(params, 'course_work_id');
      const submissions = await ClassroomAPI.listSubmissions(credentials, courseId, courseWorkId, {
        maxResults: params.max_results ?? 25,
        states: params.states?.trim() ?? '',
      });

      return submissions.length
        ? `Google Classroom submissions (${submissions.length}):\n\n${submissions
            .map((submission, index) => formatSubmission(submission, index + 1))
            .join('\n\n')}`
        : `No submissions found for coursework \`${courseWorkId}\`.`;
    }

    default:
      throw new Error(`Unknown Google Classroom tool: ${toolName}`);
  }
}
