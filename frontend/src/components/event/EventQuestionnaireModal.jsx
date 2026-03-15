import React, { useState } from "react";
import { Modal, Box, Typography, Button, TextField, Slider, Checkbox, FormControlLabel, IconButton, ToggleButton, ToggleButtonGroup, Autocomplete, Paper, Divider, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CircularProgress from '@mui/material/CircularProgress';
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from '../../utils/avatarUtils';
import MediaUploadComponent from '../common/MediaUploadComponent';

// Enhanced styling constants
const QUESTIONNAIRE_STYLES = {
  section: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #3b82f6',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      transform: 'translateY(-1px)',
    },
  },
  questionLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
    display: 'block',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  button: {
    fontSize: '14px',
    fontWeight: 500,
    padding: '10px 20px',
    borderRadius: '8px',
    textTransform: 'none',
    minHeight: '44px',
  },
  toggleButton: {
    fontSize: '14px',
    fontWeight: 500,
    padding: '12px 20px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    color: '#6b7280',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#f3f4f6',
      borderColor: '#3b82f6',
      color: '#3b82f6',
    },
    '&.Mui-selected': {
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
      color: 'white',
      '&:hover': {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
      },
    },
  },
};

// Enhanced Emoji Rating with consistent styling
const EmojiRating = ({ value, onChange, options }) => (
  <Box sx={QUESTIONNAIRE_STYLES.questionCard}>
    <Typography sx={QUESTIONNAIRE_STYLES.questionLabel}>Rate your experience</Typography>
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v) => v && onChange(v)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        '& .MuiToggleButton-root': QUESTIONNAIRE_STYLES.toggleButton,
      }}
    >
      {options.map(opt => (
        <ToggleButton key={opt.value} value={opt.value}>
          <span style={{ fontSize: '20px', marginRight: '8px' }}>{opt.emoji}</span>
          <span style={{ fontSize: '14px' }}>{opt.label}</span>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  </Box>
);

// Enhanced Number Input with better styling
const NumberInput = ({ value, onChange, min = 0, max = 1000, label, unit }) => (
  <Box sx={QUESTIONNAIRE_STYLES.questionCard}>
    <Typography sx={QUESTIONNAIRE_STYLES.questionLabel}>{label}</Typography>
    <TextField
      type="number"
      value={value}
      onChange={(e) => {
        const val = parseInt(e.target.value) || 0;
        onChange(Math.max(min, Math.min(max, val)));
      }}
      inputProps={{ min, max }}
      sx={{
        width: '100%',
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          fontSize: '16px',
          '& fieldset': {
            borderColor: '#e2e8f0',
            borderWidth: '2px',
          },
          '&:hover fieldset': {
            borderColor: '#3b82f6',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#3b82f6',
            borderWidth: '2px',
          },
        },
      }}
      InputProps={{
        endAdornment: unit && (
          <Typography sx={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
            {unit}
          </Typography>
        ),
      }}
    />
  </Box>
);

// Enhanced Checkbox group with consistent styling
const CheckboxGroup = ({ options, value = [], onChange, icons, label }) => (
  <Box sx={QUESTIONNAIRE_STYLES.questionCard}>
    <Typography sx={QUESTIONNAIRE_STYLES.questionLabel}>{label}</Typography>
    <Box display="flex" flexWrap="wrap" gap="8px">
      {options.map(opt => {
        const icon = icons?.[opt.value];
        return (
          <FormControlLabel
            key={opt.value}
            control={
              <Checkbox
                checked={value.includes(opt.value)}
                onChange={(_, checked) => {
                  if (checked) onChange([...value, opt.value]);
                  else onChange(value.filter(v => v !== opt.value));
                }}
                sx={{
                  color: '#6b7280',
                  '&.Mui-checked': {
                    color: '#3b82f6',
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '20px',
                  },
                }}
                {...(icon ? { 
                  icon: <span style={{fontSize: '20px'}}>{icon}</span>, 
                  checkedIcon: <span style={{fontSize: '20px'}}>{icon}</span> 
                } : {})}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap="6px">
                {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: 500,
                  color: '#374151',
                }}>
                  {opt.label}
                </span>
              </Box>
            }
            sx={{
              margin: 0,
              padding: '8px 12px',
              backgroundColor: value.includes(opt.value) ? '#eff6ff' : '#f9fafb',
              borderRadius: '8px',
              border: `1px solid ${value.includes(opt.value) ? '#3b82f6' : '#e5e7eb'}`,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: value.includes(opt.value) ? '#dbeafe' : '#f3f4f6',
              },
            }}
          />
        );
      })}
    </Box>
  </Box>
);

// Enhanced Slider with better styling
const SliderWithValue = ({ value, onChange, min, max, step, label, unit }) => (
  <Box sx={QUESTIONNAIRE_STYLES.questionCard}>
    <Typography sx={QUESTIONNAIRE_STYLES.questionLabel}>
      {label}: <Chip 
        label={`${value} ${unit}`} 
        color="primary" 
        variant="outlined"
        sx={{ marginLeft: '12px' }}
      />
    </Typography>
    <Slider
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(_, v) => onChange(v)}
      valueLabelDisplay="auto"
      sx={{
        color: '#3b82f6',
        height: 8,
        '& .MuiSlider-track': {
          border: 'none',
          height: 8,
          borderRadius: 4,
        },
        '& .MuiSlider-rail': {
          height: 8,
          borderRadius: 4,
          backgroundColor: '#e5e7eb',
        },
        '& .MuiSlider-thumb': {
          height: 24,
          width: 24,
          backgroundColor: '#3b82f6',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          '&:hover, &.Mui-focusVisible': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          },
        },
      }}
    />
  </Box>
);

// Enhanced Radio group with consistent styling
const RadioGroup = ({ options, value, onChange, label }) => (
  <Box sx={QUESTIONNAIRE_STYLES.questionCard}>
    <Typography sx={QUESTIONNAIRE_STYLES.questionLabel}>{label}</Typography>
    <ToggleButtonGroup
      value={value || ""}
      exclusive
      onChange={(_, v) => v && onChange(v)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        '& .MuiToggleButton-root': QUESTIONNAIRE_STYLES.toggleButton,
      }}
    >
      {options.map(opt => (
        <ToggleButton key={opt.value} value={opt.value}>
          {opt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  </Box>
);

// Enhanced Text field with consistent styling
const TextFieldEnhanced = ({ label, value, onChange, multiline = false, rows = 1 }) => (
  <Box sx={QUESTIONNAIRE_STYLES.questionCard}>
    <Typography sx={QUESTIONNAIRE_STYLES.questionLabel}>{label}</Typography>
    <TextField
      fullWidth
      value={value || ""}
      onChange={onChange}
      multiline={multiline}
      rows={rows}
      variant="outlined"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '8px',
          fontSize: '14px',
          '& fieldset': {
            borderColor: '#e2e8f0',
            borderWidth: '2px',
          },
          '&:hover fieldset': {
            borderColor: '#3b82f6',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#3b82f6',
            borderWidth: '2px',
          },
        },
      }}
    />
  </Box>
);

// Progress indicator component
const ProgressIndicator = ({ current, total }) => {
  const progress = (current / total) * 100;
  return (
    <Box sx={{ marginBottom: '24px' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
        <Typography variant="body2" color="text.secondary">
          Question {current} of {total}
        </Typography>
        <Typography variant="body2" color="primary" fontWeight={600}>
          {Math.round(progress)}% Complete
        </Typography>
      </Box>
      <Box sx={QUESTIONNAIRE_STYLES.progressBar}>
        <Box sx={{ ...QUESTIONNAIRE_STYLES.progressFill, width: `${progress}%` }} />
      </Box>
    </Box>
  );
};

// Enhanced question rendering function
function renderQuestion(q, answers, setAnswers) {
  if (q.showIf && !q.showIf(answers)) return null;
  
  const commonProps = {
    key: q.key,
    label: q.label,
    value: answers[q.key] || (q.type === 'slider' ? q.min : q.type === 'counter' ? 0 : ''),
    onChange: (v) => setAnswers(a => ({ ...a, [q.key]: v })),
  };

  switch (q.type) {
    case "slider":
      return (
        <SliderWithValue
          {...commonProps}
          min={q.min}
          max={q.max}
          step={q.step}
          unit={q.unit}
        />
      );
    case "counter":
      const { key: counterKey, ...counterProps } = commonProps;
      return (
        <NumberInput
          key={counterKey}
          {...counterProps}
          min={q.min}
          max={q.max}
          unit={q.unit}
        />
      );
    case "checkboxes":
      const { key: checkboxKey, ...checkboxProps } = commonProps;
      return (
        <CheckboxGroup
          key={checkboxKey}
          {...checkboxProps}
          options={q.options}
          icons={q.icons}
        />
      );
    case "emoji":
      const { key: emojiKey, ...emojiProps } = commonProps;
      return (
        <EmojiRating
          key={emojiKey}
          {...emojiProps}
          options={q.options}
        />
      );
    case "radio":
      const { key: radioKey, ...radioProps } = commonProps;
      return (
        <RadioGroup
          key={radioKey}
          {...radioProps}
          options={q.options}
        />
      );
    case "text":
      return (
        <TextFieldEnhanced
          {...commonProps}
          onChange={(e) => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
        />
      );
    default:
      return null;
  }
}

// --- Domain-specific question sets ---
const QUESTION_SETS = {
  "beach cleanup": [
    { key: "wasteKg", label: "How much total waste was collected?", type: "counter", min: 0, max: 1000, unit: "kg" },
    { key: "wasteTypes", label: "What types of waste were found?", type: "checkboxes", options: [
      { value: "plastic", label: "Plastic" }, { value: "glass", label: "Glass" }, { value: "metal", label: "Metal" },
      { value: "organic", label: "Organic" }, { value: "hazardous", label: "Hazardous" }, { value: "ewaste", label: "E-waste" }
    ], icons: { plastic: "🧴", glass: "🍾", metal: "🧲", organic: "🍃", hazardous: "☣️", ewaste: "💻" } },
    { key: "shorelineMeters", label: "How long was the shoreline cleaned?", type: "counter", min: 0, max: 5000, unit: "meters" },
    { key: "localsJoined", label: "Did any local citizens or groups join in?", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
    { key: "issues", label: "Were there any issues during the cleanup?", type: "checkboxes", options: [
      { value: "badWeather", label: "Bad weather" }, { value: "equipment", label: "Equipment shortage" }, { value: "other", label: "Other" }
    ] },
    { key: "issuesOther", label: "If Other, please specify", type: "text", showIf: (a) => a.issues?.includes("other") },
    { key: "mood", label: "What was the mood of the event?", type: "emoji", options: [
      { value: "great", label: "Great", emoji: "😃" }, { value: "okay", label: "Okay", emoji: "😐" }, { value: "challenging", label: "Challenging", emoji: "😞" }
    ] }
  ],
  "tree plantation": [
    { key: "saplings", label: "Number of saplings planted?", type: "counter", min: 0, max: 10000 },
    { key: "species", label: "What species were planted?", type: "checkboxes", options: [
      { value: "neem", label: "Neem" }, { value: "banyan", label: "Banyan" }, { value: "mango", label: "Mango" }, { value: "other", label: "Other" }
    ] },
    { key: "speciesOther", label: "Other species", type: "text", showIf: (a) => a.species?.includes("other") },
    { key: "area", label: "Area covered?", type: "counter", min: 0, max: 10000, unit: "sq. ft" },
    { key: "locationType", label: "Was the planting location urban, rural, or forested?", type: "radio", options: [
      { value: "urban", label: "Urban" }, { value: "rural", label: "Rural" }, { value: "forested", label: "Forested" }
    ] },
    { key: "maintenance", label: "Who will maintain the plants?", type: "radio", options: [
      { value: "ngo", label: "Local NGO" }, { value: "community", label: "Community" }, { value: "government", label: "Government" }, { value: "volunteers", label: "Volunteers" }
    ] },
    { key: "watered", label: "Were saplings watered after planting?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "challenges", label: "Any challenges faced?", type: "checkboxes", options: [
      { value: "drySoil", label: "Dry soil" }, { value: "lackTools", label: "Lack of tools" }, { value: "lowTurnout", label: "Low turnout" }, { value: "other", label: "Other" }
    ] },
    { key: "challengesOther", label: "If Other, please specify", type: "text", showIf: (a) => a.challenges?.includes("other") },
    { key: "success", label: "Rate the overall success.", type: "emoji", options: [
      { value: "poor", label: "Poor", emoji: "🌱" }, { value: "good", label: "Good", emoji: "🌿" }, { value: "excellent", label: "Excellent", emoji: "🌳" }
    ] }
  ],
  "awareness drive": [
    { key: "peopleReached", label: "Estimated number of people reached?", type: "counter", min: 0, max: 10000, unit: "people" },
    { key: "mainTopic", label: "What was the main topic?", type: "checkboxes", options: [
      { value: "plasticBan", label: "Plastic Ban" }, { value: "ewaste", label: "E-Waste" }, { value: "treeProtection", label: "Tree Protection" }, { value: "climateChange", label: "Climate Change" }, { value: "other", label: "Other" }
    ] },
    { key: "mainTopicOther", label: "Other topic", type: "text", showIf: (a) => a.mainTopic?.includes("other") },
    { key: "methods", label: "What methods were used?", type: "checkboxes", options: [
      { value: "streetPlay", label: "Street Play" }, { value: "pamphlet", label: "Pamphlet Distribution" }, { value: "publicSpeaking", label: "Public Speaking" }, { value: "poster", label: "Poster Display" }, { value: "flashMob", label: "Flash Mob" }
    ] },
    { key: "collab", label: "Did you collaborate with other groups/partners?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "collabDetails", label: "If Yes, who?", type: "text", showIf: (a) => a.collab === "yes" },
    { key: "materials", label: "What type of materials were distributed?", type: "checkboxes", options: [
      { value: "leaflets", label: "Leaflets" }, { value: "booklets", label: "Booklets" }, { value: "merchandise", label: "Merchandise" }, { value: "none", label: "None" }
    ] },
    { key: "publicResponse", label: "What was the general public response?", type: "emoji", options: [
      { value: "veryEngaged", label: "Very Engaged", emoji: "😍" }, { value: "someInterest", label: "Some Interest", emoji: "🙂" }, { value: "passive", label: "Passive", emoji: "😐" }, { value: "negative", label: "Negative", emoji: "😠" }
    ] },
    { key: "challenges", label: "Any challenges faced?", type: "checkboxes", options: [
      { value: "permissions", label: "Permissions" }, { value: "lowCrowd", label: "Low crowd" }, { value: "equipment", label: "Equipment issues" }, { value: "other", label: "Other" }
    ] },
    { key: "challengesOther", label: "If Other, please specify", type: "text", showIf: (a) => a.challenges?.includes("other") },
  ],
  "animal rescue": [
    { key: "animalsRescued", label: "How many animals were rescued?", type: "counter", min: 0, max: 1000 },
    { key: "animalTypes", label: "What types of animals were rescued?", type: "checkboxes", options: [
      { value: "dogs", label: "Dogs" }, { value: "cats", label: "Cats" }, { value: "birds", label: "Birds" }, { value: "cows", label: "Cows" }, { value: "other", label: "Others" }
    ] },
    { key: "animalTypesOther", label: "Other animals", type: "text", showIf: (a) => a.animalTypes?.includes("other") },
    { key: "condition", label: "What condition were the animals in?", type: "checkboxes", options: [
      { value: "healthy", label: "Healthy" }, { value: "injured", label: "Injured" }, { value: "critical", label: "Critical" }
    ] },
    { key: "medicalAid", label: "Was medical aid provided on-site?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "partners", label: "Who were the rescue partners or vets?", type: "text" },
    { key: "adopted", label: "Were any animals adopted or relocated?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "logistics", label: "Any logistical issues?", type: "checkboxes", options: [
      { value: "transport", label: "Transport" }, { value: "equipment", label: "Equipment" }, { value: "location", label: "Location access" }, { value: "none", label: "None" }
    ] },
    { key: "mood", label: "Organizer's mood post-rescue:", type: "emoji", options: [
      { value: "fulfilled", label: "Fulfilled", emoji: "🐶" }, { value: "tired", label: "Tired but Worth It", emoji: "😓" }, { value: "difficult", label: "Difficult Day", emoji: "😞" }
    ] }
  ],
  "education": [
    { key: "students", label: "Number of students engaged?", type: "counter", min: 0, max: 1000 },
    { key: "ageGroup", label: "What age/class group was taught?", type: "checkboxes", options: [
      { value: "1-3", label: "Grades 1–3" }, { value: "4-6", label: "Grades 4–6" }, { value: "7-9", label: "Grades 7–9" }, { value: "10+", label: "Grades 10+" }
    ] },
    { key: "topics", label: "What topics were covered?", type: "checkboxes", options: [
      { value: "waste", label: "Waste Management" }, { value: "pollution", label: "Pollution" }, { value: "recycling", label: "Recycling" }, { value: "climate", label: "Climate Change" }, { value: "health", label: "Health & Hygiene" }
    ] },
    { key: "tools", label: "What tools were used?", type: "checkboxes", options: [
      { value: "flashcards", label: "Flashcards" }, { value: "presentation", label: "Presentation" }, { value: "games", label: "Games" }, { value: "videos", label: "Videos" }
    ] },
    { key: "format", label: "What was the teaching format?", type: "radio", options: [
      { value: "interactive", label: "Interactive" }, { value: "lecture", label: "Lecture" }, { value: "group", label: "Group Activity" }
    ] },
    { key: "studentResponse", label: "What was the student response?", type: "emoji", options: [
      { value: "enthusiastic", label: "Very Enthusiastic", emoji: "😍" }, { value: "interested", label: "Interested", emoji: "🙂" }, { value: "quiet", label: "Quiet/Passive", emoji: "😐" }
    ] },
    { key: "teacherSupport", label: "Did teachers or school staff support the session?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "followup", label: "Any follow-up plans or material distribution?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "followupDetails", label: "If Yes, please specify", type: "text", showIf: (a) => a.followup === "yes" },
  ]
};

const FEEDBACK_QUESTIONS = [
  { key: "overallExperience", label: "How was your overall experience?", type: "emoji", options: [
    { value: "excellent", label: "Excellent", emoji: "😃" },
    { value: "good", label: "Good", emoji: "🙂" },
    { value: "average", label: "Average", emoji: "😐" },
    { value: "poor", label: "Poor", emoji: "😞" }
  ] },
  { key: "organization", label: "How well was the event organized?", type: "emoji", options: [
    { value: "excellent", label: "Excellent", emoji: "🏅" },
    { value: "good", label: "Good", emoji: "👍" },
    { value: "average", label: "Average", emoji: "👌" },
    { value: "poor", label: "Poor", emoji: "👎" }
  ] },
  { key: "comments", label: "Any comments or suggestions?", type: "text" }
];

export default function EventQuestionnaireModal({ open, onClose, eventType, onSubmit, isCreator, volunteerParticipants = [], organizerParticipants = [] }) {
  // If creator, use full question set; else, use feedback only
  const questions = isCreator
    ? (QUESTION_SETS[eventType?.toLowerCase()] || [])
    : FEEDBACK_QUESTIONS;
  const [answers, setAnswers] = useState({});
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Volunteer awards state
  const [bestVolunteers, setBestVolunteers] = useState([]);
  const [mostPunctual, setMostPunctual] = useState([]);
  const [customVolunteerAwards, setCustomVolunteerAwards] = useState([]); // [{ title: '', userIds: [] }]
  // Organizer awards state
  const [bestOrganizers, setBestOrganizers] = useState([]);
  const [mostDedicated, setMostDedicated] = useState([]);
  const [customOrganizerAwards, setCustomOrganizerAwards] = useState([]); // [{ title: '', userIds: [] }]

  // For adding a new custom award (volunteer)
  const [newVolunteerAwardTitle, setNewVolunteerAwardTitle] = useState("");
  const [newVolunteerAwardUsers, setNewVolunteerAwardUsers] = useState([]);
  // For adding a new custom award (organizer)
  const [newOrganizerAwardTitle, setNewOrganizerAwardTitle] = useState("");
  const [newOrganizerAwardUsers, setNewOrganizerAwardUsers] = useState([]);

  const handleMediaChange = (media) => {
    setMediaFiles(media);
  };

  const handleAddCustomVolunteerAward = () => {
    if (!newVolunteerAwardTitle.trim() || newVolunteerAwardUsers.length === 0) return;
    setCustomVolunteerAwards([...customVolunteerAwards, { title: newVolunteerAwardTitle.trim(), userIds: newVolunteerAwardUsers }]);
    setNewVolunteerAwardTitle("");
    setNewVolunteerAwardUsers([]);
  };
  const handleRemoveCustomVolunteerAward = (idx) => {
    setCustomVolunteerAwards(customVolunteerAwards.filter((_, i) => i !== idx));
  };
  const handleAddCustomOrganizerAward = () => {
    if (!newOrganizerAwardTitle.trim() || newOrganizerAwardUsers.length === 0) return;
    setCustomOrganizerAwards([...customOrganizerAwards, { title: newOrganizerAwardTitle.trim(), userIds: newOrganizerAwardUsers }]);
    setNewOrganizerAwardTitle("");
    setNewOrganizerAwardUsers([]);
  };
  const handleRemoveCustomOrganizerAward = (idx) => {
    setCustomOrganizerAwards(customOrganizerAwards.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Pass answers, mediaFiles, and awards
      const awards = isCreator ? {
        volunteers: {
          bestVolunteers,
          mostPunctual,
          customAwards: customVolunteerAwards
        },
        organizers: {
          bestOrganizers,
          mostDedicated,
          customAwards: customOrganizerAwards
        }
      } : undefined;
      await onSubmit(answers, mediaFiles, awards);
    } catch (error) {
      console.error('Questionnaire submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        p: 4,
        bgcolor: "white",
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: 800,
        mx: "auto",
        mt: 4,
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Header Section */}
        <Box sx={{
          textAlign: 'center',
          marginBottom: '32px',
          paddingBottom: '20px',
          borderBottom: '2px solid #e2e8f0',
        }}>
          <Typography variant="h4" sx={{
            color: '#1e293b',
            fontWeight: 700,
            marginBottom: '8px',
          }}>
            📋 Event Questionnaire
          </Typography>
          <Typography variant="body1" sx={{
            color: '#64748b',
            fontSize: '16px',
          }}>
            {eventType ? `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event Feedback` : 'Event Feedback'}
          </Typography>
        </Box>

        {/* Progress Indicator */}
        {questions.length > 0 && (
          <ProgressIndicator 
            current={Object.keys(answers).filter(key => answers[key] !== undefined && answers[key] !== '').length} 
            total={questions.length} 
          />
        )}

        {/* Questions Section */}
        {questions.length === 0 ? (
          <Box sx={QUESTIONNAIRE_STYLES.section}>
            <Typography variant="h6" sx={{ textAlign: 'center', color: '#64748b' }}>
              No questionnaire available for this event type.
            </Typography>
          </Box>
        ) : (
          <Box sx={QUESTIONNAIRE_STYLES.section}>
            <Box sx={QUESTIONNAIRE_STYLES.sectionHeader}>
              <span style={{ fontSize: '24px' }}>❓</span>
              <Typography sx={QUESTIONNAIRE_STYLES.sectionTitle}>
                Event Details & Feedback
              </Typography>
            </Box>
            {questions.map(q => renderQuestion(q, answers, setAnswers))}
          </Box>
        )}
        
        {/* Award selection for creator only */}
        {isCreator && (
          <>
            {/* Volunteer Awards Section */}
            <Box sx={QUESTIONNAIRE_STYLES.section}>
              <Box sx={QUESTIONNAIRE_STYLES.sectionHeader}>
                <span style={{ fontSize: '24px' }}>🏆</span>
                <Typography sx={QUESTIONNAIRE_STYLES.sectionTitle}>
                  Volunteer Awards
                </Typography>
              </Box>
              {/* Best Volunteer */}
              <Autocomplete
                multiple
                options={volunteerParticipants}
                getOptionLabel={u => u.name || u.email || u._id}
                value={volunteerParticipants.filter(u => bestVolunteers.includes(u._id))}
                onChange={(_, vals) => setBestVolunteers(vals.map(u => u._id))}
                renderInput={params => <TextField {...params} label="Best Volunteer(s)" margin="normal" />}
                renderOption={(props, option) => (
                  <Box component="li" {...props} display="flex" alignItems="center">
                    {getProfileImageUrl(option) ? (
                      <img
                        src={getProfileImageUrl(option)}
                        alt={option.name}
                        style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          marginRight: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                          border: '2px solid #bbf7d0',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                          color: '#16a34a',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        {getAvatarInitial(option)}
                      </Box>
                    )}
                    <span>{option.name || option.email || option._id}</span>
                  </Box>
                )}
              />
              {/* Most Punctual */}
              <Autocomplete
                multiple
                options={volunteerParticipants}
                getOptionLabel={u => u.name || u.email || u._id}
                value={volunteerParticipants.filter(u => mostPunctual.includes(u._id))}
                onChange={(_, vals) => setMostPunctual(vals.map(u => u._id))}
                renderInput={params => <TextField {...params} label="Most Punctual" margin="normal" />}
                renderOption={(props, option) => (
                  <Box component="li" {...props} display="flex" alignItems="center">
                    {getProfileImageUrl(option) ? (
                      <img
                        src={getProfileImageUrl(option)}
                        alt={option.name}
                        style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          marginRight: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                          border: '2px solid #bbf7d0',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                          color: '#16a34a',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        {getAvatarInitial(option)}
                      </Box>
                    )}
                    <span>{option.name || option.email || option._id}</span>
                  </Box>
                )}
              />
              {/* Custom Volunteer Awards */}
              <Box mt={2} mb={1}>
                <Typography variant="subtitle2">Add Custom Volunteer Award</Typography>
                <TextField
                  label="Award Title"
                  value={newVolunteerAwardTitle}
                  onChange={e => setNewVolunteerAwardTitle(e.target.value)}
                  size="small"
                  sx={{ mr: 1, width: 180 }}
                />
                <Autocomplete
                  multiple
                  options={volunteerParticipants}
                  getOptionLabel={u => u.name || u.email || u._id}
                  value={volunteerParticipants.filter(u => newVolunteerAwardUsers.includes(u._id))}
                  onChange={(_, vals) => setNewVolunteerAwardUsers(vals.map(u => u._id))}
                  renderInput={params => <TextField {...params} label="Recipients" size="small" sx={{ width: 180 }} />}
                  sx={{ display: 'inline-block', mr: 1 }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} display="flex" alignItems="center">
                      {getProfileImageUrl(option) ? (
                        <img
                          src={getProfileImageUrl(option)}
                          alt={option.name}
                          style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8 }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            marginRight: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                            border: '2px solid #bbf7d0',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                            color: '#16a34a',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                        >
                          {getAvatarInitial(option)}
                        </Box>
                      )}
                      <span>{option.name || option.email || option._id}</span>
                    </Box>
                  )}
                />
                <Button onClick={handleAddCustomVolunteerAward} variant="outlined" size="small">Add</Button>
              </Box>
              {/* List of custom volunteer awards */}
              {customVolunteerAwards.length > 0 && (
                <Box mt={1}>
                  {customVolunteerAwards.map((award, idx) => (
                    <Box key={idx} display="flex" alignItems="center" mb={1}>
                      <Typography sx={{ fontWeight: 500, mr: 1 }}>{award.title}:</Typography>
                      <Typography sx={{ color: '#555', mr: 2 }}>
                        {volunteerParticipants.filter(u => award.userIds.includes(u._id)).map(u => u.name || u.email || u._id).join(', ')}
                      </Typography>
                      <Button onClick={() => handleRemoveCustomVolunteerAward(idx)} size="small" color="error">Remove</Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            {/* Organizer Awards Section */}
            <Box mt={3} mb={2}>
              <Typography variant="subtitle1" gutterBottom>Organizer Awards</Typography>
              {/* Best Organizer */}
              <Autocomplete
                multiple
                options={organizerParticipants}
                getOptionLabel={u => u.name || u.email || u._id}
                value={organizerParticipants.filter(u => bestOrganizers.includes(u._id))}
                onChange={(_, vals) => setBestOrganizers(vals.map(u => u._id))}
                renderInput={params => <TextField {...params} label="Best Organizer(s)" margin="normal" />}
                renderOption={(props, option) => (
                  <Box component="li" {...props} display="flex" alignItems="center">
                    {getProfileImageUrl(option) ? (
                      <img
                        src={getProfileImageUrl(option)}
                        alt={option.name}
                        style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          marginRight: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          border: '2px solid #bfdbfe',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                          color: '#2563eb',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        {getAvatarInitial(option)}
                      </Box>
                    )}
                    <span>{option.name || option.email || option._id}</span>
                  </Box>
                )}
              />
              {/* Most Dedicated Organizer */}
              <Autocomplete
                multiple
                options={organizerParticipants}
                getOptionLabel={u => u.name || u.email || u._id}
                value={organizerParticipants.filter(u => mostDedicated.includes(u._id))}
                onChange={(_, vals) => setMostDedicated(vals.map(u => u._id))}
                renderInput={params => <TextField {...params} label="Most Dedicated" margin="normal" />}
                renderOption={(props, option) => (
                  <Box component="li" {...props} display="flex" alignItems="center">
                    {getProfileImageUrl(option) ? (
                      <img
                        src={getProfileImageUrl(option)}
                        alt={option.name}
                        style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          marginRight: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          border: '2px solid #bfdbfe',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                          color: '#2563eb',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        {getAvatarInitial(option)}
                      </Box>
                    )}
                    <span>{option.name || option.email || option._id}</span>
                  </Box>
                )}
              />
              {/* Custom Organizer Awards */}
              <Box mt={2} mb={1}>
                <Typography variant="subtitle2">Add Custom Organizer Award</Typography>
                <TextField
                  label="Award Title"
                  value={newOrganizerAwardTitle}
                  onChange={e => setNewOrganizerAwardTitle(e.target.value)}
                  size="small"
                  sx={{ mr: 1, width: 180 }}
                />
                <Autocomplete
                  multiple
                  options={organizerParticipants}
                  getOptionLabel={u => u.name || u.email || u._id}
                  value={organizerParticipants.filter(u => newOrganizerAwardUsers.includes(u._id))}
                  onChange={(_, vals) => setNewOrganizerAwardUsers(vals.map(u => u._id))}
                  renderInput={params => <TextField {...params} label="Recipients" size="small" sx={{ width: 180 }} />}
                  sx={{ display: 'inline-block', mr: 1 }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} display="flex" alignItems="center">
                      {getProfileImageUrl(option) ? (
                        <img
                          src={getProfileImageUrl(option)}
                          alt={option.name}
                          style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8 }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            marginRight: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                            border: '2px solid #bfdbfe',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                            color: '#2563eb',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                        >
                          {getAvatarInitial(option)}
                        </Box>
                      )}
                      <span>{option.name || option.email || option._id}</span>
                    </Box>
                  )}
                />
                <Button onClick={handleAddCustomOrganizerAward} variant="outlined" size="small">Add</Button>
              </Box>
              {/* List of custom organizer awards */}
              {customOrganizerAwards.length > 0 && (
                <Box mt={1}>
                  {customOrganizerAwards.map((award, idx) => (
                    <Box key={idx} display="flex" alignItems="center" mb={1}>
                      <Typography sx={{ fontWeight: 500, mr: 1 }}>{award.title}:</Typography>
                      <Typography sx={{ color: '#555', mr: 2 }}>
                        {organizerParticipants.filter(u => award.userIds.includes(u._id)).map(u => u.name || u.email || u._id).join(', ')}
                      </Typography>
                      <Button onClick={() => handleRemoveCustomOrganizerAward(idx)} size="small" color="error">Remove</Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </>
        )}
        
        {/* Media upload section */}
        <Box sx={QUESTIONNAIRE_STYLES.section}>
          <Box sx={QUESTIONNAIRE_STYLES.sectionHeader}>
            <span style={{ fontSize: '24px' }}>📸</span>
            <Typography sx={QUESTIONNAIRE_STYLES.sectionTitle}>
              Upload Images & Videos
            </Typography>
          </Box>
          <MediaUploadComponent
            onMediaChange={handleMediaChange}
            maxFiles={10}
            acceptedTypes="image/*,video/*"
            maxFileSize={10 * 1024 * 1024} // 10MB
            folder="events/questionnaire-media"
            disabled={isSubmitting}
            existingMedia={mediaFiles}
          />
        </Box>

        {/* Submit Buttons */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '16px',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '2px solid #e2e8f0',
        }}>
          <Button 
            onClick={onClose} 
            variant="outlined"
            disabled={isSubmitting}
            sx={{
              ...QUESTIONNAIRE_STYLES.button,
              borderColor: '#6b7280',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#374151',
                backgroundColor: '#f9fafb',
              },
              '&:disabled': {
                borderColor: '#9ca3af',
                color: '#9ca3af',
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={questions.length === 0 || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
            sx={{
              ...QUESTIONNAIRE_STYLES.button,
              backgroundColor: '#3b82f6',
              '&:hover': {
                backgroundColor: '#2563eb',
              },
              '&:disabled': {
                backgroundColor: '#9ca3af',
              },
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Questionnaire'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
} 