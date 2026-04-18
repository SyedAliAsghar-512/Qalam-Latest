import mongoose from "mongoose";
import Jwt from "jsonwebtoken";

const attendanceRecordSchema = new mongoose.Schema(
  {
    sr_no: { type: Number },
    date: { type: String },
    status: { type: String },
    fine: { type: String },
  },
  { _id: false }
);

const attendanceItemSchema = new mongoose.Schema(
  {
    course_name: { type: String },
    course_code: { type: String },
    academic_term: { type: String },
    attendance_percentage: { type: Number },
    classes_conducted: { type: Number },
    classes_attended: { type: Number },
    records: { type: [attendanceRecordSchema], default: [] },
    semester: { type: String },
    href: { type: String },
    type: { type: String }, // LECTURE | LAB | DEFAULT
  },
  { _id: false }
);

const resultItemSchema = new mongoose.Schema(
  {
    course_name: { type: String },
    category: { type: String },
    assessment: { type: String },
    max_mark: { type: Number },
    obtained_marks: { type: Number },
    class_average: { type: Number },
    percentage: { type: Number },
    semester: { type: String },
    type: { type: String }, // LECTURE | LAB | DEFAULT
  },
  { _id: false }
);

const classItemSchema = new mongoose.Schema(
  {
    course_name: { type: String },
    instructor: { type: String },
    course_code: { type: String },
    credits: { type: Number },
    attendance: { type: String },
    semester: { type: String },
    href: { type: String },
  },
  { _id: false }
);

const StudentSchema = new mongoose.Schema({
  student_info: {
    name: { type: String },
    student_id: { type: String, unique: true, sparse: true },
    campus: { type: String },
    status: { type: String },
  },

  qalam_session: {
    cookies: { type: Array, default: [] }, // full puppeteer cookie objects
    saved_at: { type: Date },
    expires_at: { type: Date },
  },

  last_synced_at: { type: Date },

  dashboard: {
    academic_standings: {
      cgpa: { type: Number },
      earned_credits: { type: Number },
      total_credits: { type: Number },
      inprogress_credits: { type: Number },
    },
    classes: { type: [classItemSchema], default: [] },
    news_announcements: {
      type: [{ title: { type: String }, date: { type: String } }],
      default: [],
    },
    results: { type: [resultItemSchema], default: [] },
    attendance: { type: [attendanceItemSchema], default: [] },
    today_classes: {
      type: [{ subject: { type: String }, start_time: { type: String }, end_time: { type: String } }],
      default: [],
    },
  },
});

StudentSchema.methods.getJwtToken = function () {
  return Jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export default mongoose.models.Student || mongoose.model("Student", StudentSchema);