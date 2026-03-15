import React, { useState } from "react";
import { Modal, Box, Typography, Button, TextField, Checkbox, FormControlLabel, ToggleButton, ToggleButtonGroup, IconButton, CircularProgress } from "@mui/material";
import MediaUploadComponent from '../common/MediaUploadComponent';

// Helper: Emoji/Face rating
const EmojiRating = ({ value, onChange, options }) => (
  <ToggleButtonGroup
    value={value}
    exclusive
    onChange={(_, v) => v && onChange(v)}
    sx={{ 
      mb: 2,
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      '& .MuiToggleButton-root': {
        fontSize: '14px',
        fontWeight: 500,
        padding: '10px 16px',
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
    }}
  >
    {options.map(opt => (
      <ToggleButton key={opt.value} value={opt.value}>
        <span style={{ fontSize: '18px', marginRight: '6px' }}>{opt.emoji}</span>
        <span style={{ fontSize: '14px' }}>{opt.label}</span>
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
);

// Helper: Number Input
const NumberInput = ({ value, onChange, min = 0, max = 1000, unit }) => (
  <TextField
    type="number"
    value={value}
    onChange={(e) => {
      const val = parseInt(e.target.value) || 0;
      onChange(Math.max(min, Math.min(max, val)));
    }}
    inputProps={{ min, max }}
    fullWidth
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
    InputProps={{
      endAdornment: unit && (
        <Typography sx={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
          {unit}
        </Typography>
      ),
    }}
  />
);

// Helper: Checkbox group
const CheckboxGroup = ({ options, value = [], onChange, icons }) => (
  <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
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
              {...(icon ? { icon: <span style={{fontSize: 18}}>{icon}</span>, checkedIcon: <span style={{fontSize: 18}}>{icon}</span> } : {})}
            />
          }
          label={
            <Box display="flex" alignItems="center" gap={6}>
              {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
              <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                {opt.label}
              </span>
            </Box>
          }
          sx={{
            margin: 0,
            padding: '6px 10px',
            backgroundColor: value.includes(opt.value) ? '#eff6ff' : '#f9fafb',
            borderRadius: '6px',
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
);



// --- Domain-specific question sets for volunteers ---
const VOLUNTEER_QUESTION_SETS = {
  "beach cleanup": [
    { 
      key: "wasteTypes", 
      label: "What types of waste did you collect?", 
      type: "checkboxes", 
      options: [
        { value: "plastic", label: "Plastic" }, 
        { value: "glass", label: "Glass" }, 
        { value: "metal", label: "Metal" },
        { value: "organic", label: "Organic" }, 
        { value: "hazardous", label: "Hazardous" }
      ], 
      icons: { plastic: "🧴", glass: "🍾", metal: "🧲", organic: "🍃", hazardous: "☣️" } 
    },
    { 
      key: "physicalDemand", 
      label: "How physically demanding was it?", 
      type: "emoji", 
      options: [
        { value: "easy", label: "Easy", emoji: "💤" }, 
        { value: "moderate", label: "Moderate", emoji: "😌" }, 
        { value: "demanding", label: "Demanding", emoji: "😓" }, 
        { value: "exhausting", label: "Exhausting", emoji: "🥵" }
      ] 
    },
    { 
      key: "beachCleanliness", 
      label: "How clean was the beach after the event?", 
      type: "radio", 
      options: [
        { value: "veryClean", label: "Very Clean (80-100%)", emoji: "✨" },
        { value: "clean", label: "Clean (60-80%)", emoji: "👍" },
        { value: "moderate", label: "Moderate (40-60%)", emoji: "😐" },
        { value: "dirty", label: "Still Dirty (20-40%)", emoji: "😞" },
        { value: "veryDirty", label: "Very Dirty (0-20%)", emoji: "🤢" }
      ]
    },
    { 
      key: "wouldRepeat", 
      label: "Would you do this again?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ],
  "tree plantation": [
    { 
      key: "saplingsPlanted", 
      label: "How many saplings did you plant?", 
      type: "counter", 
      min: 0, 
      max: 100 
    },
    { 
      key: "saplingSize", 
      label: "What size were the saplings?", 
      type: "radio", 
      options: [
        { value: "small", label: "🌱 Small" }, 
        { value: "medium", label: "🌿 Medium" }, 
        { value: "large", label: "🌳 Large" }
      ] 
    },
    { 
      key: "species", 
      label: "Which species did you plant?", 
      type: "checkboxes", 
      options: [
        { value: "neem", label: "Neem" }, 
        { value: "banyan", label: "Banyan" }, 
        { value: "mango", label: "Mango" }, 
        { value: "other", label: "Other" }
      ] 
    },
    { 
      key: "soilHardness", 
      label: "How hard was the soil?", 
      type: "emoji", 
      options: [
        { value: "easy", label: "Easy", emoji: "🏖️" }, 
        { value: "hard", label: "Hard", emoji: "🪨" }
      ] 
    },
    { 
      key: "waterProvided", 
      label: "Was water provided for the saplings?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "no", label: "No" }
      ] 
    },
    { 
      key: "revisitCare", 
      label: "Would you like to revisit and care for them?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ],
  "awareness drive": [
    { 
      key: "peopleTalked", 
      label: "How many people did you talk to?", 
      type: "counter", 
      min: 0, 
      max: 100, 
      unit: "people"
    },
    { 
      key: "methods", 
      label: "Which methods did you use?", 
      type: "checkboxes", 
      options: [
        { value: "pamphlets", label: "Pamphlets" }, 
        { value: "skit", label: "Skit" }, 
        { value: "speech", label: "Speech" }, 
        { value: "posters", label: "Posters" }
      ], 
      icons: { pamphlets: "📜", skit: "🎭", speech: "🎤", posters: "🎨" } 
    },
    { 
      key: "peopleResponse", 
      label: "How did people respond?", 
      type: "emoji", 
      options: [
        { value: "veryInterested", label: "Very Interested", emoji: "😍" }, 
        { value: "interested", label: "Interested", emoji: "🙂" }, 
        { value: "indifferent", label: "Indifferent", emoji: "😐" }, 
        { value: "opposed", label: "Opposed", emoji: "😡" }
      ] 
    },
    { 
      key: "primaryRole", 
      label: "What was your primary role?", 
      type: "radio", 
      options: [
        { value: "organizer", label: "Organizer" }, 
        { value: "spokesperson", label: "Spokesperson" }, 
        { value: "support", label: "Support" }, 
        { value: "logistics", label: "Logistics" }
      ] 
    },
    { 
      key: "unansweredQuestions", 
      label: "Did anyone ask questions you couldn't answer?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "no", label: "No" }
      ] 
    },
    { 
      key: "participateAgain", 
      label: "Would you like to participate in similar drives?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ],
  "animal rescue": [
    { 
      key: "animalsHelped", 
      label: "How many animals did you help rescue?", 
      type: "counter", 
      min: 0, 
      max: 50 
    },
    { 
      key: "animalTypes", 
      label: "What types of animals did you assist?", 
      type: "checkboxes", 
      options: [
        { value: "dog", label: "Dog" }, 
        { value: "cat", label: "Cat" }, 
        { value: "cow", label: "Cow" }, 
        { value: "bird", label: "Bird" }, 
        { value: "other", label: "Other" }
      ], 
      icons: { dog: "🐶", cat: "🐱", cow: "🐄", bird: "🐦", other: "🐾" } 
    },
    { 
      key: "tasks", 
      label: "What tasks did you perform?", 
      type: "checkboxes", 
      options: [
        { value: "handling", label: "Handling" }, 
        { value: "feeding", label: "Feeding" }, 
        { value: "firstAid", label: "First Aid" }, 
        { value: "transport", label: "Transport" }
      ], 
      icons: { handling: "🛌", feeding: "🧃", firstAid: "🩺", transport: "🚗" } 
    },
    { 
      key: "emotionalExperience", 
      label: "How emotional was the experience for you?", 
      type: "emoji", 
      options: [
        { value: "neutral", label: "Neutral", emoji: "😐" }, 
        { value: "touching", label: "Touching", emoji: "😢" }, 
        { value: "fulfilling", label: "Fulfilling", emoji: "😍" }, 
        { value: "heartwarming", label: "Heartwarming", emoji: "🐾" }
      ] 
    },
    { 
      key: "medicalAid", 
      label: "Was proper medical aid available?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "no", label: "No" }, 
        { value: "notSure", label: "Not Sure" }
      ] 
    },
    { 
      key: "volunteerAgain", 
      label: "Would you volunteer for animal rescue again?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ],
  "education": [
    { 
      key: "studentsInGroup", 
      label: "How many students were in your group?", 
      type: "counter", 
      min: 0, 
      max: 100, 
      unit: "students"
    },
    { 
      key: "gradeLevel", 
      label: "What grade level were they?", 
      type: "checkboxes", 
      options: [
        { value: "1-3", label: "1–3" }, 
        { value: "4-6", label: "4–6" }, 
        { value: "7-9", label: "7–9" }, 
        { value: "10+", label: "10+" }
      ] 
    },
    { 
      key: "topics", 
      label: "Which topics did you help teach?", 
      type: "checkboxes", 
      options: [
        { value: "environment", label: "Environment" }, 
        { value: "hygiene", label: "Hygiene" }, 
        { value: "recycling", label: "Recycling" }, 
        { value: "others", label: "Others" }
      ], 
      icons: { environment: "🌎", hygiene: "🧼", recycling: "🔄", others: "📖" } 
    },
    { 
      key: "role", 
      label: "What was your role?", 
      type: "radio", 
      options: [
        { value: "speaker", label: "Speaker" }, 
        { value: "assistant", label: "Assistant" }, 
        { value: "organizer", label: "Organizer" }, 
        { value: "techHelper", label: "Tech Helper" }
      ] 
    },
    { 
      key: "studentResponse", 
      label: "How responsive were the students?", 
      type: "emoji", 
      options: [
        { value: "quiet", label: "Quiet", emoji: "😐" }, 
        { value: "curious", label: "Curious", emoji: "🙂" }, 
        { value: "superEngaged", label: "Super Engaged", emoji: "🤩" }
      ] 
    },
    { 
      key: "teachAgain", 
      label: "Would you teach again in a future session?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ]
};

// Common questions for all event types
const COMMON_QUESTIONS = [
  { 
    key: "satisfaction", 
    label: "How satisfied are you with this event?", 
    type: "radio", 
    options: [
      { value: "5", label: "⭐⭐⭐⭐⭐ Very Satisfied" },
      { value: "4", label: "⭐⭐⭐⭐ Satisfied" },
      { value: "3", label: "⭐⭐⭐ Neutral" },
      { value: "2", label: "⭐⭐ Dissatisfied" },
      { value: "1", label: "⭐ Very Dissatisfied" }
    ]
  },
  { 
    key: "feeling", 
    label: "Share how you feel now", 
    type: "emoji", 
    options: [
      { value: "amazing", label: "Amazing", emoji: "🥰" }, 
      { value: "accomplished", label: "Accomplished", emoji: "🙌" }, 
      { value: "content", label: "Content", emoji: "😌" }, 
      { value: "tired", label: "Tired", emoji: "😓" }, 
      { value: "frustrated", label: "Frustrated", emoji: "😠" }
    ] 
  },
  { 
    key: "recommend", 
    label: "Would you recommend this event to others?", 
    type: "radio", 
    options: [
      { value: "yes", label: "Yes" }, 
      { value: "no", label: "No" }
    ] 
  },
  { 
    key: "comments", 
    label: "Comments", 
    type: "text" 
  }
];

const renderQuestion = (q, answers, setAnswers) => {
  switch (q.type) {
    case "counter":
      return (
        <Box key={q.key} mb={2}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#374151' }}>
            {q.label}
          </Typography>
          <NumberInput
            value={answers[q.key] || 0}
            onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))}
            min={q.min}
            max={q.max}
            unit={q.unit}
          />
        </Box>
      );

    case "checkboxes":
      return (
        <Box key={q.key} mb={2}>
          <Typography>{q.label}</Typography>
          <CheckboxGroup
            options={q.options}
            value={answers[q.key] || []}
            onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))}
            icons={q.icons}
          />
        </Box>
      );
    case "emoji":
      return (
        <Box key={q.key} mb={2}>
          <Typography>{q.label}</Typography>
          <EmojiRating
            value={answers[q.key] || ""}
            onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))}
            options={q.options}
          />
        </Box>
      );
    case "radio":
      return (
        <Box key={q.key} mb={2}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#374151' }}>
            {q.label}
          </Typography>
          <ToggleButtonGroup
            value={answers[q.key] || ""}
            exclusive
            onChange={(_, v) => v && setAnswers(a => ({ ...a, [q.key]: v }))}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              '& .MuiToggleButton-root': {
                fontSize: '14px',
                fontWeight: 500,
                padding: '10px 16px',
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
            }}
          >
            {q.options.map(opt => (
              <ToggleButton key={opt.value} value={opt.value}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      );
    case "text":
      return (
        <Box key={q.key} mb={2}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#374151' }}>
            {q.label}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={answers[q.key] || ""}
            onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
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
    default:
      return null;
  }
}

export default function VolunteerQuestionnaireModal({ open, onClose, eventType, onSubmit }) {
  const eventQuestions = VOLUNTEER_QUESTION_SETS[eventType?.toLowerCase()] || [];
  const allQuestions = [...eventQuestions, ...COMMON_QUESTIONS];
  const [answers, setAnswers] = useState({});
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMediaChange = (media) => {
    setMediaFiles(media);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Pass both answers and media files
      await onSubmit(answers, mediaFiles);
    } catch (error) {
      console.error('Questionnaire submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        p: 3,
        bgcolor: "white",
        borderRadius: 2,
        boxShadow: 3,
        maxWidth: 500,
        mx: "auto",
        mt: 6,
        maxHeight: '80vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Typography variant="h6" color="primary" gutterBottom>
          Complete Volunteer Questionnaire
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Help us improve future events by sharing your experience!
        </Typography>
        
        {allQuestions.length === 0 ? (
          <Typography>No questionnaire available for this event type.</Typography>
        ) : (
          allQuestions.map(q => renderQuestion(q, answers, setAnswers))
        )}

        {/* Media Upload Section */}
        <Box mt={3} mb={3}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
            📸 Upload Images (Optional)
          </Typography>
          
          <MediaUploadComponent
            onMediaChange={handleMediaChange}
            maxFiles={5}
            acceptedTypes="image/*"
            maxFileSize={10 * 1024 * 1024} // 10MB
            folder="events/questionnaire-media"
            disabled={isSubmitting}
            existingMedia={mediaFiles}
          />
        </Box>

        <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
          <Button 
            onClick={onClose} 
            variant="outlined"
            disabled={isSubmitting}
            sx={{
              fontSize: '14px',
              fontWeight: 500,
              padding: '10px 20px',
              borderRadius: '8px',
              textTransform: 'none',
              minHeight: '44px',
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
            disabled={allQuestions.length === 0 || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
            sx={{
              fontSize: '14px',
              fontWeight: 500,
              padding: '10px 20px',
              borderRadius: '8px',
              textTransform: 'none',
              minHeight: '44px',
              backgroundColor: '#3b82f6',
              '&:hover': {
                backgroundColor: '#2563eb',
              },
              '&:disabled': {
                backgroundColor: '#9ca3af',
              },
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
