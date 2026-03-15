const express = require("express");
const router = express.Router();
const {protect} = require("../middlewares/authMiddleware");
const { registerForEvent, checkRegistration, withdrawRegistration, getMyRegisteredEvents, getRegistrationForVolunteerEvent, entryScan } = require("../controllers/registrationController");

// POST /api/registrations
router.post("/", protect, registerForEvent);
// GET /api/registrations/:eventId/check
router.get("/:eventId/check", protect, checkRegistration);
// DELETE /api/registrations/:eventId
router.delete("/:eventId", protect, withdrawRegistration);
// GET /api/registrations/my-events
router.get("/my-events", protect, getMyRegisteredEvents);
// GET a specific registration for a user on an event, to get QR code etc.
router.get("/event/:eventId/my-registration", protect, getRegistrationForVolunteerEvent);
// GET /api/registrations/event/:eventId/volunteers - get all volunteers registered for an event
router.get('/event/:eventId/volunteers', require('../controllers/registrationController').getVolunteersForEvent);
// GET /api/registrations/volunteer/:volunteerId/events - get all events a volunteer is registered for
router.get('/volunteer/:volunteerId/events', require('../controllers/registrationController').getEventsForVolunteer);
// GET /api/registrations/volunteer/:volunteerId - get all registrations for a volunteer
router.get('/volunteer/:volunteerId', require('../controllers/registrationController').getRegistrationsForVolunteer);
// PATCH /api/registrations/:registrationId/attendance - mark attendance for a volunteer
router.patch('/:registrationId/attendance', protect, require('../controllers/registrationController').updateAttendance);
router.patch('/:registrationId/in-time', require('../controllers/registrationController').updateInTime);
router.patch('/:registrationId/out-time', require('../controllers/registrationController').updateOutTime);
router.post('/:registrationId/entry-scan', entryScan);
router.post('/exit/:exitQrToken', require('../controllers/registrationController').exitScan);
router.get('/:registrationId/exit-qr', require('../controllers/registrationController').generateExitQr);
// POST /api/registrations/event/:eventId/questionnaire - complete volunteer questionnaire
router.post('/event/:eventId/questionnaire', protect, require('../controllers/registrationController').completeVolunteerQuestionnaire);
// GET /api/registrations/event/:eventId/comments - get questionnaire comments for an event
router.get('/event/:eventId/comments', protect, require('../controllers/registrationController').getEventQuestionnaireComments);
// GET /api/registrations/event/:eventId/stats - get real-time attendance statistics
router.get('/event/:eventId/stats', protect, require('../controllers/registrationController').getAttendanceStats);
// GET /api/registrations/event/:eventId/report - download attendance report
router.get('/event/:eventId/report', protect, require('../controllers/attendanceReportController').generateAttendanceReport);

module.exports = router;
