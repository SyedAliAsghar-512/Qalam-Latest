import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendToken from "../utils/sendToken.js";
import Student from "../models/studentschema.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* -------------------------------------------------------------------------- */
/*                                BROWSER LOGIN                               */
/* -------------------------------------------------------------------------- */

const launchBrowser = async () =>
  puppeteer.launch({
    headless: "true",
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

const loginToQalam = async (page, username, password) => {
  await page.goto("https://qalam.nust.edu.pk/web/login", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForSelector("input[name='login']", { timeout: 15000 });
  await page.waitForSelector("input[name='password']", { timeout: 15000 });

  await page.type("input[name='login']", username, { delay: 60 });
  await page.type("input[name='password']", password, { delay: 60 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }),
    page.click("button[type='submit']"),
  ]);

  await sleep(1200);

  const current = page.url();
  return current.includes("/student/dashboard") || current.includes("dashboard");
};

const parseDashboardBasicFromPage = async (page) => {
  // Get both innerText and innerHTML
  const dashboardText = await page.evaluate(() => document.body.innerText || "");
  const dashboardHtml = await page.evaluate(() => document.body.innerHTML);

  // Use Cheerio to parse the HTML and extract all the /student/course/info links with visible text
  const $ = cheerio.load(dashboardHtml);
  const courseLinks = [];
  $("a[href*='/student/course/info/']").each((_, a) => {
    const hrefRaw = $(a).attr("href") || "";
    const href = hrefRaw.startsWith("http")
      ? hrefRaw
      : `https://qalam.nust.edu.pk${hrefRaw.startsWith("/") ? "" : "/"}${hrefRaw}`;
    // Find the course name in the .card-header <span>
    const courseName = $(a).find("div.card-header span").text().trim();
    // Find the course code in sub-heading span
    const courseCode = $(a).find(".card-body .card-text .sub-heading").text().trim();
    // Find the instructor in h6.card-title
    const instructor = $(a).find(".card-title").text().trim();
    // Find credits
    const credits = parseFloat($(a).find(".card-text > .md-list-heading").text().trim() || "0");
    // Find semester
    const semester = $(a).find(".uk-text-small").last().text().trim();
    // Find attendance
    const attendanceMatch = $(a).find("div.uk-text-small").html()?.match(/Attendance:\s*<span>([\d.]+)<\/span>%/);
    const attendance = attendanceMatch ? `${attendanceMatch[1]}%` : "";
    courseLinks.push({
      course_name: courseName,
      instructor,
      course_code: courseCode,
      credits,
      attendance,
      semester,
      href,
    });
  });

  // Use the links directly as your classes array
  const classes = courseLinks;

  // Continue with previous logic
  const studentInfo = {
    name: dashboardText.match(/([A-Za-z ]+)\s+(\d{11})\s+NUST [A-Za-z ]+ Campus/)?.[1] || "Unknown",
    student_id: dashboardText.match(/(\d{11})/)?.[1] || "00000000000",
    campus: dashboardText.match(/(NUST [A-Za-z ]+ Campus)/)?.[1] || "Unknown",
    status: "NUST Student",
  };

  const academicStandings = {
    cgpa: parseFloat(dashboardText.match(/CGPA:\s*([\d.]+)/)?.[1] || "0"),
    earned_credits: parseFloat(dashboardText.match(/Earned Cr :\s*([\d.]+)/)?.[1] || "0"),
    total_credits: parseFloat(dashboardText.match(/Total Cr :\s*([\d.]+)/)?.[1] || "0"),
    inprogress_credits: parseFloat(dashboardText.match(/Inprogress Cr :\s*([\d.]+)/)?.[1] || "0"),
  };

  const newsAnnouncements = Array.from(
    dashboardText.matchAll(/(.+)\n(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/g)
  ).map((x) => ({ title: x[1].trim(), date: x[2].trim() }));

  const convertTo12Hour = (hour, minute) => {
    let h = parseInt(hour, 10);
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${period}`;
  };

  const todayClasses = [];
  for (const x of dashboardText.matchAll(
    /([A-Za-z ]+)\s*:\s*(\d{2}):(\d{2})\s*Hrs\.\s*-\s*(\d{2}):(\d{2})\s*Hrs\./g
  )) {
    todayClasses.push({
      subject: x[1].trim(),
      start_time: convertTo12Hour(x[2], x[3]),
      end_time: convertTo12Hour(x[4], x[5]),
    });
  }

  return { studentInfo, academicStandings, classes, newsAnnouncements, todayClasses };
};

/* -------------------------------------------------------------------------- */
/*                           COOKIE-BASED HTTP CLIENT                          */
/* -------------------------------------------------------------------------- */

const buildCookieHeader = (cookies = []) => cookies.map((c) => `${c.name}=${c.value}`).join("; ");

const qalamHttp = async ({ url, cookies, method = "GET", data = null }) => {
  const cookieHeader = buildCookieHeader(cookies);

  const resp = await axios({
    url,
    method,
    data,
    timeout: 60000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: {
      Cookie: cookieHeader,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/json,application/xhtml+xml,*/*",
    },
  });

  return resp;
};

const getStudentOr404 = async (userId) => {
  const student = await Student.findById(userId);
  if (!student) throw new ErrorHandler("Student not found", 404);
  return student;
};

const assertSessionValid = (student) => {
  const cookies = student?.qalam_session?.cookies || [];
  if (!cookies.length) throw new ErrorHandler("Qalam session not found. Please login again.", 401);

  if (student?.qalam_session?.expires_at && new Date() > new Date(student.qalam_session.expires_at)) {
    throw new ErrorHandler("Qalam session expired. Please login again.", 401);
  }

  return cookies;
};

const ensureNotRedirectedToLogin = (resp) => {
  const finalUrl = `${resp?.request?.res?.responseUrl || ""}`;
  if (resp.status === 401 || finalUrl.includes("/web/login")) {
    throw new ErrorHandler("Qalam session expired. Please login again.", 401);
  }
};

const setQalamSessionOnStudent = async (studentId, cookies) => {
  const sessionCookie = cookies.find((c) => c.name === "session_id");
  const expiresAt = sessionCookie?.expires ? new Date(sessionCookie.expires * 1000) : null;

  await Student.findByIdAndUpdate(studentId, {
    $set: {
      "qalam_session.cookies": cookies,
      "qalam_session.saved_at": new Date(),
      "qalam_session.expires_at": expiresAt,
    },
  });
};

/* -------------------------------------------------------------------------- */
/*                              HTML PARSE HELPERS                             */
/* -------------------------------------------------------------------------- */

const parseCourseLinksFromResultsPage = (html) => {
  const $ = cheerio.load(html);
  const links = [];

  $("a[href*='/student/course/gradebook/']").each((_, a) => {
    const hrefRaw = $(a).attr("href") || "";
    const href = hrefRaw.startsWith("http")
      ? hrefRaw
      : `https://qalam.nust.edu.pk${hrefRaw.startsWith("/") ? "" : "/"}${hrefRaw}`;

    links.push({
      text: $(a).text().trim(),
      href,
    });
  });

  return links;
};

const clickTabLikeInCheerio = ($, tabName) => {
  const name = tabName.toUpperCase();
  let found = false;

  $("button, a, [role='tab'], .nav-link, .tab").each((_, el) => {
    const t = ($(el).text() || "").trim().toUpperCase();
    if (t.includes(name)) found = true;
  });

  return found;
};

const parseGradebookRows = (html) => {
  const $ = cheerio.load(html);
  const rows = [];

  $("table tbody tr").each((_, row) => {
    const t = $(row).find("td");
    if (!t.length) return;

    const category = $(t[0]).text().trim();
    const assessment = $(t[1]).text().trim();

    if (!category && !assessment) return;

    rows.push({
      category,
      assessment,
      max_mark: parseFloat($(t[2]).text().trim() || "0") || 0,
      obtained_marks: parseFloat($(t[3]).text().trim() || "0") || 0,
      class_average: parseFloat($(t[4]).text().trim() || "0") || 0,
      percentage: parseFloat($(t[5]).text().trim() || "0") || 0,
    });
  });

  return rows;
};

const parseAttendancePage = (html) => {
  const $ = cheerio.load(html);
  const text = $("body").text();

  const course_code = text.match(/Course Code\s*:\s*(.+)/)?.[1]?.trim() || "";
  const academic_term = text.match(/Academic Term\s*:\s*(.+)/)?.[1]?.trim() || "";
  const classes_conducted = parseInt(
    text.match(/Number of classes Conducted\s*:\s*(\d+)/)?.[1] || "0",
    10
  );
  const classes_attended = parseInt(
    text.match(/Number of classes Attended\s*:\s*(\d+)/)?.[1] || "0",
    10
  );
  const attendance_percentage = parseFloat(
    text.match(/Attendance Percentage\s*:\s*([\d.]+)/)?.[1] || "0"
  );

  const records = [];
  $("table tbody tr").each((_, row) => {
    const t = $(row).find("td");
    if (!t.length) return;

    records.push({
      sr_no: parseInt($(t[0]).text().trim() || "0", 10),
      date: $(t[1]).text().trim(),
      status: $(t[2]).text().trim(),
      fine: $(t[3]).text().trim(),
    });
  });

  return {
    course_code,
    academic_term,
    classes_conducted,
    classes_attended,
    attendance_percentage,
    records,
  };
};

const mapCourseLinksToClasses = (classes, links) => {
  const mapped = classes.map((c) => ({ ...c }));

  mapped.forEach((c) => {
    const byName = links.find((l) =>
      l.text.toLowerCase().includes((c.course_name || "").toLowerCase())
    );
    const byCode = links.find((l) =>
      l.text.toLowerCase().includes((c.course_code || "").toLowerCase())
    );

    const found = byName || byCode;
    if (found) c.href = found.href;
  });

  return mapped;
};

/* -------------------------------------------------------------------------- */
/*                          COURSE-WISE DIRECT FETCHERS                        */
/* -------------------------------------------------------------------------- */

const fetchAndAttachCourseLinks = async (cookies, classes) => {
  const resultsPageResp = await qalamHttp({
    url: "https://qalam.nust.edu.pk/student/results/",
    cookies,
  });
  ensureNotRedirectedToLogin(resultsPageResp);

  const links = parseCourseLinksFromResultsPage(resultsPageResp.data);
  return mapCourseLinksToClasses(classes || [], links);
};

// Helper to clean strings
const cleanText = (txt) =>
  (txt || "")
    .replace(/\s+/g, " ")
    .replace(/%/g, "")
    .replace(/\u00A0/g, " ")
    .trim();

// Best: parse gradebook for Odoo portal (tabbed, grouped)
const parseOdooGradebookByTabs = (html, courseMeta) => {
  const $ = cheerio.load(html);
  const results = [];
  $("#tabs_anim1 > li").each((tabIdx, li) => {
    const tabType =
      tabIdx === 0 ? "LECTURE" : tabIdx === 1 ? "LAB" : "DEFAULT";
    const tabHtml = $(li).html();
    const $$ = cheerio.load(tabHtml);

    let currentCategory = "";
    let currentWeight = "";

    $$("table.uk-table").each((tableIdx, table) => {
      $$(table)
        .find("tbody")
        .children()
        .each((i, row) => {
          const $row = $$(row);

          if ($row.hasClass("table-parent-row")) {
            let label = $row
              .find("a.js-toggle-children-row")
              .contents()
              .filter(function () { return this.type === "text"; })
              .text()
              .trim();
            let badge = $row.find(".uk-badge").text().replace("%", "").trim();
            currentCategory = cleanText(label);
            currentWeight = cleanText(badge);
          } else if ($row.hasClass("md-bg-blue-grey-800")) {
            // skip header
          } else if ($row.hasClass("table-child-row")) {
            const tds = $row.find("td");
            if (tds.length < 5) return;
            const assessment = cleanText($$(tds[0]).text());
            const max_mark = parseFloat(cleanText($$(tds[1]).text())) || 0;
            const obtained_marks = parseFloat(cleanText($$(tds[2]).text())) || 0;
            const class_average = parseFloat(cleanText($$(tds[3]).text())) || 0;
            const percentage = parseFloat(cleanText($$(tds[4]).text())) || 0;
            if (
              !assessment &&
              max_mark === 0 &&
              obtained_marks === 0 &&
              class_average === 0 &&
              percentage === 0
            )
              return;

            results.push({
              ...(courseMeta || {}),
              category: currentCategory,
              category_weight: currentWeight,
              assessment,
              max_mark,
              obtained_marks,
              class_average,
              percentage,
              type: tabType,
            });
          }
        });
    });
  });
  return results;
};

const scrapeResultsForAllCoursesViaHttp = async (cookies, classes) => {
  const results = [];
  for (const course of classes || []) {
    if (!course?.href) continue;
    const gradebookHref = course.href.replace('/info/', '/gradebook/');
    const resp = await qalamHttp({ url: gradebookHref, cookies });
    ensureNotRedirectedToLogin(resp);
    const html = resp.data || "";
    const courseMeta = {
      course_name: course.course_name,
      course_code: course.course_code,
      semester: course.semester,
      href: gradebookHref,
    };
    const courseResults = parseOdooGradebookByTabs(html, courseMeta);
    results.push(...courseResults);
  }
  return results;
};

const scrapeAttendanceForAllCoursesViaHttp = async (cookies, classes) => {
  
  const attendance = [];
  const seen = new Set();

  for (const course of classes || []) {
    if (!course.href) continue;

    const attendanceHref = course.href.replace('/info/', '/attendance/');
    
    const resp = await qalamHttp({ url: attendanceHref, cookies });
    ensureNotRedirectedToLogin(resp);

    const html = resp.data || "";
    const $ = cheerio.load(html);

    const tabTitles = [];
    $("ul.uk-tab > li").each((i, el) => {
      const title = $(el).text().trim().toUpperCase();
      tabTitles.push(title);
    });

    $("ul.uk-switcher > li").each((i, el) => {
      let type = "DEFAULT";
      if (Array.isArray(tabTitles) && tabTitles.length > i) {
        if (tabTitles[i].includes("LECTURE")) type = "LECTURE";
        else if (tabTitles[i].includes("LAB")) type = "LAB";
      }

      const container = $(el);

      // ==== Extract values defensively ====
      let courseName = "";
      container.find("li").each((_, li) => {
        const b = $(li).find("b").text().trim();
        const spanText = $(li).find("span").text().trim();
        if (/^Course *:$/i.test(b)) courseName = spanText;
      });

      let courseCode = "";
      container.find("li").each((_, li) => {
        const b = $(li).find("b").text().trim();
        const spanText = $(li).find("span").text().trim();
        if (/^Course Code *:$/i.test(b)) courseCode = spanText;
      });
      if (!courseCode) courseCode = course.course_code;

      let academicTerm = "";
      container.find("li").each((_, li) => {
        const b = $(li).find("b").text().trim();
        const spanText = $(li).find("span").text().trim();
        if (/^Academic Term *:$/i.test(b)) academicTerm = spanText;
      });
      if (!academicTerm) academicTerm = course.semester || "";

      let classesConducted = 0, classesAttended = 0, attendancePercentage = 0;
      container.find("li").each((_, li) => {
        const b = $(li).find("b").text().trim();
        const spanText = $(li).find("span").text().trim();
        if (/^Number of classes Conducted *:$/i.test(b)) {
          const val = parseInt(spanText, 10);
          if (!isNaN(val)) classesConducted = val;
        }
        if (/^Number of classes Attended *:$/i.test(b)) {
          const val = parseInt(spanText, 10);
          if (!isNaN(val)) classesAttended = val;
        }
        if (/^Attendance Percentage:?$/i.test(b)) {
          const val = parseFloat(spanText);
          if (!isNaN(val)) attendancePercentage = val;
        }
      });

      // Defensive skip: skip if no course code
      if (!courseCode) return true;

      // === Attendance records ===
      const records = [];
      container.find("table.uk-table tbody tr").each((_, tr) => {
        const tds = $(tr).find("td");
        if (tds.length >= 4) {
          records.push({
            sr_no: $(tds[0]).text().trim(),
            date: $(tds[1]).text().trim(),
            status: $(tds[2]).text().trim(),
            fine: $(tds[3]).text().trim(),
          });
        }
      });

      // Compose and dedupe
      const uniqKey = [courseCode, academicTerm, type].join("___");
      if (seen.has(uniqKey)) return true;
      seen.add(uniqKey);

      attendance.push({
        course_name: courseName || course.course_name,
        course_code: courseCode,
        academic_term: academicTerm,
        attendance_percentage: attendancePercentage,
        classes_conducted: classesConducted,
        classes_attended: classesAttended,
        records,
        semester: academicTerm,
        href: attendanceHref,
        type,
      });
    });
  }


  return attendance;
};

/* -------------------------------------------------------------------------- */
/*                               AUTH CONTROLLERS                              */
/* -------------------------------------------------------------------------- */

/**
 * LOGIN FLOW:
 * 1) Puppeteer login only
 * 2) Save cookies/session in DB
 * 3) Scrape only lightweight dashboard basics
 * 4) Do NOT scrape detailed results/attendance here
 */
export const loginUser = catchAsyncErrors(async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return next(new ErrorHandler("Username and Password is Required", 400));
  }

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    const ok = await loginToQalam(page, username, password);
    if (!ok) {
      await browser.close();
      return next(new ErrorHandler("Invalid Username or Password", 401));
    }

    await page.goto("https://qalam.nust.edu.pk/student/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const { studentInfo, academicStandings, classes, newsAnnouncements, todayClasses } =
      await parseDashboardBasicFromPage(page);

    const cookies = await page.cookies();
    await browser.close();

    const sessionCookie = cookies.find((c) => c.name === "session_id");
    const expiresAt = sessionCookie?.expires ? new Date(sessionCookie.expires * 1000) : null;

    const student = await Student.findOneAndUpdate(
      { "student_info.student_id": studentInfo.student_id },
      {
        $set: {
          "student_info.name": studentInfo.name,
          "student_info.student_id": studentInfo.student_id,
          "student_info.campus": studentInfo.campus,
          "student_info.status": studentInfo.status,

          "dashboard.academic_standings": academicStandings,
          "dashboard.classes": classes,
          "dashboard.news_announcements": newsAnnouncements,
          "dashboard.today_classes": todayClasses,

          "qalam_session.cookies": cookies,
          "qalam_session.saved_at": new Date(),
          "qalam_session.expires_at": expiresAt,
          "last_synced_at": new Date(),
        },
      },
      { upsert: true, new: true }
    );

    sendToken(student, 200, res);
  } catch (error) {
    if (browser) await browser.close();
    return next(new ErrorHandler("Login failed", 400));
  }
});

export const getQalamSessionStatus = catchAsyncErrors(async (req, res) => {
  const student = await Student.findById(req.user._id);
  const hasCookies = !!student?.qalam_session?.cookies?.length;
  const expiresAt = student?.qalam_session?.expires_at || null;
  const expired = expiresAt ? new Date() > new Date(expiresAt) : true;

  res.status(200).json({
    success: true,
    has_session: hasCookies,
    expires_at: expiresAt,
    expired,
  });
});

/**
 * COURSE-WISE RESULTS SYNC (direct Qalam HTTP via cookies)
 */
export const syncResultsOnly = catchAsyncErrors(async (req, res, next) => {
  try {
    const student = await getStudentOr404(req.user._id);
    const cookies = assertSessionValid(student);

    // Ensure latest classes have href links
    const existingClasses = student?.dashboard?.classes || [];

    const results = await scrapeResultsForAllCoursesViaHttp(cookies, existingClasses);

    await Student.findByIdAndUpdate(student._id, {
      $set: {
        "dashboard.classes": existingClasses,
        "dashboard.results": results,
        "last_synced_at": new Date(),
      },
    });

    res.status(200).json({
      success: true,
      results
    });
  } catch (e) {
    if (e instanceof ErrorHandler) return next(e);
    return next(new ErrorHandler("Results sync failed", 400));
  }
});

/**
 * COURSE-WISE ATTENDANCE SYNC (direct Qalam HTTP via cookies)
 */
export const syncAttendanceOnly = catchAsyncErrors(async (req, res, next) => {
  try {
    const student = await getStudentOr404(req.user._id);
    const cookies = assertSessionValid(student);

    const existingClasses = student?.dashboard?.classes || [];

    const attendance = await scrapeAttendanceForAllCoursesViaHttp(cookies, existingClasses);

    await setQalamSessionOnStudent(student._id, cookies);

    await Student.findByIdAndUpdate(student._id, {
      $set: {
        "dashboard.classes": existingClasses,
        "dashboard.attendance": attendance,
        "last_synced_at": new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Attendance synced (course-wise)",
      count: attendance.length,
      courses: classesWithLinks.length,
    });
  } catch (e) {
    if (e instanceof ErrorHandler) return next(e);
    return next(new ErrorHandler("Attendance sync failed", 400));
  }
});

/**
 * FULL COURSE-WISE SYNC (results + attendance)
 */
export const syncAll = catchAsyncErrors(async (req, res, next) => {
  try {
    const student = await getStudentOr404(req.user._id);
    const cookies = assertSessionValid(student);

    const existingClasses = student?.dashboard?.classes || [];
    const classesWithLinks = await fetchAndAttachCourseLinks(cookies, existingClasses);

    const [results, attendance] = await Promise.all([
      scrapeResultsForAllCoursesViaHttp(cookies, classesWithLinks),
      scrapeAttendanceForAllCoursesViaHttp(cookies, classesWithLinks),
    ]);

    await setQalamSessionOnStudent(student._id, cookies);

    await Student.findByIdAndUpdate(student._id, {
      $set: {
        "dashboard.classes": classesWithLinks,
        "dashboard.results": results,
        "dashboard.attendance": attendance,
        "last_synced_at": new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "All data synced (course-wise)",
      resultsCount: results.length,
      attendanceCount: attendance.length,
      courses: classesWithLinks.length,
    });
  } catch (e) {
    if (e instanceof ErrorHandler) return next(e);
    return next(new ErrorHandler("Full sync failed", 400));
  }
});


export const getUserProfile = catchAsyncErrors(async (req, res) => {
  const student = await Student.findById(req.user._id);
  res.status(200).json({ success: true, student });
});

export const getProfileAndRefreshQalam = catchAsyncErrors(async (req, res, next) => {
  const student = await Student.findById(req.user._id);
  if (!student) return next(new ErrorHandler("Student not found", 404));

  const cookies = student?.qalam_session?.cookies || [];
  if (!cookies.length) return res.status(401).json({ success: false, message: "Not logged in to Qalam" });

  // Fetch latest dashboard HTML with session cookies
  const resp = await qalamHttp({
    url: "https://qalam.nust.edu.pk/student/dashboard",
    cookies,
  });
  if (resp.status === 401 || `${resp.request?.res?.responseUrl || ""}`.includes("/web/login")) {
    return res.status(401).json({ success: false, message: "Qalam session expired" });
  }

  // Parse the dashboard page
  const $ = cheerio.load(resp.data || "");
  // Use the same extraction logic as in parseDashboardBasicFromPage, but with Cheerio on the html string
  const bodyText = $("body").text() || "";

function extractStudentName($, bodyText) {
  const lines = bodyText.split("\n").map(l => l.trim()).filter(Boolean);
  let name = "Unknown";
  for (let i = 0; i < lines.length - 1; i++) {
    if (
      /^[A-Za-z .'-]+$/.test(lines[i]) &&
      /^\d{11}$/.test(lines[i + 1]) &&
      !lines[i].toLowerCase().includes("campus")
    ) {
      name = lines[i].trim();
      break;
    }
  }
  if (name === "Unknown") {
    let h3 = $("h3").first().text().trim();
    if (h3.length > 2) name = h3;
    let strong = $("strong").first().text().trim();
    if (name === "Unknown" && strong.length > 2) name = strong;
  }
  if (name === "Unknown") {
    let other = lines.find(
      l => /^[A-Za-z][A-Za-z .'-]+$/.test(l) && !l.toLowerCase().includes("campus")
    );
    if (other) name = other;
  }
  return name || "Unknown";
}

const name = extractStudentName($, bodyText);
const student_id = bodyText.match(/(\d{11})/)?.[1] || "00000000000";
const campus = bodyText.match(/NUST [A-Za-z ]+ Campus/)?.[0] || "Unknown";
const status = "NUST Student";

const studentInfo = {
  name,
  student_id,
  campus,
  status,
};

  const academicStandings = {
    cgpa: parseFloat(bodyText.match(/CGPA:\s+([\d.]+)/)?.[1] || "0"),
    earned_credits: parseFloat(bodyText.match(/Earned Cr :\s+([\d.]+)/)?.[1] || "0"),
    total_credits: parseFloat(bodyText.match(/Total Cr :\s+([\d.]+)/)?.[1] || "0"),
    inprogress_credits: parseFloat(bodyText.match(/Inprogress Cr :\s+([\d.]+)/)?.[1] || "0"),
  };

  const todayClasses = [];
  for (const x of bodyText.matchAll(
    /([A-Za-z ]+)\s*:\s*(\d{2}):(\d{2})\s*Hrs\.\s*-\s*(\d{2}):(\d{2})\s*Hrs\./g
  )) {
    const convertTo12Hour = (hour, minute) => {
      let h = parseInt(hour, 10);
      const period = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${h}:${minute} ${period}`;
    };
    todayClasses.push({
      subject: x[1].trim(),
      start_time: convertTo12Hour(x[2], x[3]),
      end_time: convertTo12Hour(x[4], x[5]),
    });
  }

  // Store latest dashboard in MongoDB as well
  await Student.findByIdAndUpdate(student._id, {
    $set: {
      "student_info.name": studentInfo.name,
      "student_info.student_id": studentInfo.student_id,
      "student_info.campus": studentInfo.campus,
      "student_info.status": studentInfo.status,
      "dashboard.academic_standings": academicStandings,
      "dashboard.today_classes": todayClasses,
      "last_synced_at": new Date(),
    }
  });

  // Respond with latest data
  const updatedStudent = await Student.findById(student._id);
  res.status(200).json({ success: true, student: updatedStudent });
});

export const getResults = catchAsyncErrors(async (req, res) => {
  const student = await Student.findById(req.user._id);
  res.status(200).json({ success: true, results: student?.dashboard?.results || [] });
});

export const getAttendance = catchAsyncErrors(async (req, res) => {
  const student = await Student.findById(req.user._id);
  res.status(200).json({ success: true, attendance: student?.dashboard?.attendance || [] });
});

export const logoutUser = catchAsyncErrors(async (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: "logged-out" });
});