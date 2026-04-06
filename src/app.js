



const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json()); // ⭐ THIS IS THE FIX
app.use(express.urlencoded({ extended: true }));


const authRoutes = require('./routes/auth.routes');
const superAdminRoutes = require('./routes/superadmin.routes');
const schoolAdminRoutes = require('./routes/schooladmin.routes');

app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/schooladmin', schoolAdminRoutes);

const systemRoutes = require('./routes/system.routes');
app.use('/api/system', systemRoutes);

const classRoutes = require('./routes/class.routes');
app.use('/api/classes', classRoutes);

const teacherRoutes = require('./routes/teacher.routes');
app.use('/api/teacher', teacherRoutes);

const studentRoutes = require('./routes/student.routes');
app.use('/api/students', studentRoutes);

const attendanceRoutes = require('./routes/attendance.routes');
app.use('/api/attendance', attendanceRoutes);

const marksRoutes = require('./routes/marks.routes');
app.use('/api/marks', marksRoutes);

const examRoutes = require('./routes/exam.routes');
app.use('/api/exams', examRoutes);

const subjectRoutes = require('./routes/subject.routes');
app.use('/api/subjects', subjectRoutes);

const teacherSubjectRoutes = require('./routes/teacherSubject.routes');
app.use('/api/teacher-subjects', teacherSubjectRoutes);

const academicSessionRoutes = require('./routes/academicSession.routes');
app.use('/api/academic-sessions', academicSessionRoutes);

const adminAnalyticsRoutes = require('./routes/adminAnalytics.routes');

app.use('/api/admin/analytics', adminAnalyticsRoutes);


const admissionRoutes = require('./routes/admissions.routes');
app.use('/api/admissions', admissionRoutes);

app.use('/api/timetable', require('./routes/timetable.routes'));


app.get('/', (req, res) => {
  res.send('SchoolEase Backend is running');
});

module.exports = app;
