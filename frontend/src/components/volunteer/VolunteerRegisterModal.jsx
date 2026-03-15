// src/components/volunteer/VolunteerRegisterModal.jsx

import React, { useState, useEffect } from "react";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../../utils/avatarUtils";
import { getSafeUserData, getSafeUserName } from "../../utils/safeUserUtils";
import { showAlert, showConfirm } from "../../utils/notifications";
import { ButtonLoader } from "../../components/common/LoaderComponents";
import {
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  LinkIcon
} from "@heroicons/react/24/outline";
import TimeSlotSelector from './TimeSlotSelector';

const VolunteerRegisterModal = ({ open, onClose, volunteer, onSubmit, event, isRegistering = false }) => {
  const [step, setStep] = useState(1);
  const [isGroup, setIsGroup] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [newMember, setNewMember] = useState({ name: "", phone: "", email: "" });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  const handleAddMember = () => {
    if (newMember.name && newMember.phone && newMember.email) {
      setGroupMembers([...groupMembers, newMember]);
      setNewMember({ name: "", phone: "", email: "" });
    }
  };

  const handleRegister = () => {
    // Validate time slot selection if event has time slots
    if (event?.timeSlotsEnabled && event?.timeSlots?.length > 0) {
      if (!selectedTimeSlot) {
        showAlert.warning("Please select a time slot and category.");
        return;
      }
    }

    // Validate group members if group registration
    if (isGroup) {
      if (!groupMembers.length) {
        showAlert.warning("Please add at least one group member.");
        return;
      }
      for (const member of groupMembers) {
        if (!member.name || !member.phone || !member.email) {
          showAlert.warning("All group members must have name, phone, and email.");
          return;
        }
      }
    }
    const payload = {
      groupMembers: isGroup ? groupMembers : [],
      selectedTimeSlot: selectedTimeSlot,
    };
    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
        <button
          className="absolute top-2 right-3 text-xl text-gray-500 hover:text-red-600"
          onClick={onClose}
        >
          ×
        </button>
        {step === 1 && (
          <div>
            <div className="text-lg font-semibold mb-4">Confirm Your Details</div>
            <div className="flex items-center gap-4 mb-4">
              {volunteer.profileImage ? (
                <img
                  src={getProfileImageUrl(volunteer)}
                  alt={volunteer.name}
                  className="w-12 h-12 rounded-full object-cover bg-gray-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 shadow-sm">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(volunteer?.name)}</span>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-800">{volunteer.name}</p>
                <p className="text-sm text-gray-600">{volunteer.email}</p>
                <p className="text-sm text-gray-600">{volunteer.phone}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              To update your details, please go to your profile settings.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full mt-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="text-lg font-semibold mb-4">Register as Individual or Group?</div>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => { 
                  setIsGroup(false); 
                  setStep(event?.timeSlotsEnabled && event?.timeSlots?.length > 0 ? 5 : 4); 
                }}
                className={`flex-1 py-2 rounded ${!isGroup ? 'bg-blue-600 text-white' : 'bg-white border border-blue-600 text-blue-600'} font-semibold`}
              >
                Individual
              </button>
              <button
                onClick={() => { 
                  setIsGroup(true); 
                  setStep(event?.timeSlotsEnabled && event?.timeSlots?.length > 0 ? 5 : 3); 
                }}
                className={`flex-1 py-2 rounded ${isGroup ? 'bg-blue-600 text-white' : 'bg-white border border-blue-600 text-blue-600'} font-semibold`}
              >
                Group
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="text-lg font-semibold mb-2">Add Group Members</div>
            <div className="space-y-2 mb-2">
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Full Name"
                value={newMember.name}
                onChange={e => setNewMember({ ...newMember, name: e.target.value })}
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Phone Number"
                value={newMember.phone}
                onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Email Address"
                value={newMember.email}
                onChange={e => setNewMember({ ...newMember, email: e.target.value })}
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Add Member
              </button>
            </div>

            {groupMembers.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 mb-1">Added Members:</h4>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {groupMembers.map((member, index) => (
                    <li key={index}>{member.name} - {member.email}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between">
              <button
                className="px-4 py-2 rounded border border-gray-400 text-gray-700 hover:bg-gray-100"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                onClick={() => setStep(event?.timeSlotsEnabled && event?.timeSlots?.length > 0 ? 5 : 4)}
                className={`px-4 py-2 rounded ${groupMembers.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                disabled={groupMembers.length === 0}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="text-lg font-semibold mb-3">Confirm & Register</div>
            <p className="mb-4 text-sm text-gray-600">
              Please confirm to register for this event. A QR code will be generated after successful registration.
            </p>
            
            {selectedTimeSlot && (
              <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm font-semibold text-blue-800">Selected Time Slot:</p>
                <p className="text-sm text-blue-700">
                  {selectedTimeSlot.slotName} ({selectedTimeSlot.categoryName})
                </p>
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                className="px-4 py-2 rounded border border-gray-400 text-gray-700 hover:bg-gray-100"
                onClick={() => setStep(event?.timeSlotsEnabled && event?.timeSlots?.length > 0 ? 5 : (isGroup ? 3 : 2))}
              >
                Back
              </button>
              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className={`px-4 py-2 rounded flex items-center justify-center gap-2 ${
                  isRegistering 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isRegistering ? (
                  <>
                    <ButtonLoader size="sm" color="white" />
                    Generating QR Code...
                  </>
                ) : (
                  'Register'
                )}
              </button>
            </div>
          </div>
        )}

        {step === 5 && event?.timeSlotsEnabled && event?.timeSlots?.length > 0 && (
          <div>
            <div className="text-lg font-semibold mb-3">Select Time Slot & Category</div>
            <div className="mb-4">
              <TimeSlotSelector
                timeSlots={event.timeSlots}
                onSelectionChange={setSelectedTimeSlot}
                selectedTimeSlot={selectedTimeSlot}
              />
            </div>
            <div className="flex justify-between">
              <button
                className="px-4 py-2 rounded border border-gray-400 text-gray-700 hover:bg-gray-100"
                onClick={() => setStep(isGroup ? 3 : 2)}
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className={`px-4 py-2 rounded ${!selectedTimeSlot ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                disabled={!selectedTimeSlot}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerRegisterModal;