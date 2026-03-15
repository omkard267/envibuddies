// src/pages/MyRequests.jsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";

export default function MyRequests() {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axiosInstance.get(`/api/organizations/my-requests`);

        setPending(res.data.pending);
        setApproved(res.data.approved);
      } catch (err) {
        console.error("❌ Failed to fetch requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-blue-700">My Organization Requests</h1>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* Pending Requests */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-2 text-yellow-600">Pending Requests</h2>
              {pending.length === 0 ? (
                <p className="text-gray-500">You have no pending join requests.</p>
              ) : (
                <ul className="space-y-3">
                  {pending.map((org) => (
                    <li key={org._id} className="bg-white border p-4 rounded shadow">
                      <p className="font-semibold text-blue-800">{org.name}</p>
                      <p className="text-sm text-gray-600">{org.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Approved Memberships */}
            <section>
              <h2 className="text-xl font-semibold mb-2 text-green-700">Approved Memberships</h2>
              {approved.length === 0 ? (
                <p className="text-gray-500">You're not a member of any organizations yet.</p>
              ) : (
                <ul className="space-y-3">
                  {approved.map((org) => (
                    <li key={org._id} className="bg-white border p-4 rounded shadow">
                      <p className="font-semibold text-blue-800">{org.name}</p>
                      <p className="text-sm text-gray-600">{org.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
