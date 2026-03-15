// src/components/event/EventStepTwo.jsx

import React from "react";
import {
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";

export default function EventStepTwo({ questionnaireData, setQuestionnaireData, onNext, onBack }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuestionnaireData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <Box sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Event Logistics Questionnaire
      </Typography>

      <FormGroup sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              name="waterProvided"
              checked={questionnaireData.waterProvided || false}
              onChange={handleChange}
            />
          }
          label="Will drinking water be provided?"
        />
        <FormControlLabel
          control={
            <Checkbox
              name="medicalSupport"
              checked={questionnaireData.medicalSupport || false}
              onChange={handleChange}
            />
          }
          label="Is medical support available on-site?"
        />
      </FormGroup>

      <FormControl fullWidth margin="normal">
        <InputLabel>Recommended Age Group</InputLabel>
        <Select
          name="ageGroup"
          value={questionnaireData.ageGroup || ""}
          onChange={handleChange}
          label="Recommended Age Group"
        >
          <MenuItem value="All Ages">All Ages</MenuItem>
          <MenuItem value="12-18">12–18</MenuItem>
          <MenuItem value="18-25">18–25</MenuItem>
          <MenuItem value="25-40">25–40</MenuItem>
          <MenuItem value="40+">40+</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        name="precautions"
        label="Any special precautions volunteers should follow?"
        value={questionnaireData.precautions || ""}
        onChange={handleChange}
        margin="normal"
        multiline
        rows={2}
      />

      <TextField
        fullWidth
        name="publicTransport"
        label="Nearest public transport options"
        value={questionnaireData.publicTransport || ""}
        onChange={handleChange}
        margin="normal"
      />

      <TextField
        fullWidth
        name="contactPerson"
        label="Contact person on ground (name and phone)"
        value={questionnaireData.contactPerson || ""}
        onChange={handleChange}
        margin="normal"
      />

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button variant="outlined" color="primary" onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" color="primary" onClick={onNext}>
          Preview Event
        </Button>
      </Box>
    </Box>
  );
}
