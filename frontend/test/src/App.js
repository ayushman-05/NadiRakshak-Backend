import React, { useState } from "react";

const CampaignCreation = () => {
  const [campaignData, setCampaignData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    bannerImage: null,
    isPaid: false,
    participationFee: 0,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setCampaignData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : type === "file" ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Create FormData for file upload
    const formData = new FormData();
    Object.keys(campaignData).forEach((key) => {
      formData.append(key, campaignData[key]);
    });

    try {
      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZTNjMGMzZDFhOTgyZjQ5ZGMxMTRiOSIsImlhdCI6MTc0MzE5MTI4NiwiZXhwIjoxNzQzMTk0ODg2fQ.wyA6kI86YazV4lsN67GV3DfncBHtDK1ipE1cOpkW0sc";
      const response = await fetch(
        "https://nadirakshak-backend.onrender.com/api/campaigns/create",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Campaign creation failed");
      }

      // Redirect to payment link if exists
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      }
    } catch (error) {
      console.error("Campaign creation error:", error);
      // Handle error (show message to user)
      alert(error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl mb-4">Create Campaign</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Campaign Name"
          value={campaignData.name}
          onChange={handleInputChange}
          required
          className="w-full p-2 mb-2 border"
        />
        <textarea
          name="description"
          placeholder="Campaign Description"
          value={campaignData.description}
          onChange={handleInputChange}
          required
          className="w-full p-2 mb-2 border"
        />
        <div className="flex">
          <input
            type="date"
            name="startDate"
            value={campaignData.startDate}
            onChange={handleInputChange}
            required
            className="w-1/2 p-2 mb-2 border"
          />
          <input
            type="date"
            name="endDate"
            value={campaignData.endDate}
            onChange={handleInputChange}
            required
            className="w-1/2 p-2 mb-2 border"
          />
        </div>
        <input
          type="file"
          name="bannerImage"
          onChange={handleInputChange}
          className="w-full p-2 mb-2"
        />
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            name="isPaid"
            checked={campaignData.isPaid}
            onChange={handleInputChange}
            className="mr-2"
          />
          <label>Is this a Paid Campaign?</label>
        </div>
        {campaignData.isPaid && (
          <input
            type="number"
            name="participationFee"
            placeholder="Participation Fee (Rs)"
            value={campaignData.participationFee}
            onChange={handleInputChange}
            required
            className="w-full p-2 mb-2 border"
          />
        )}
        <button type="submit" className="w-full bg-blue-500 text-white p-2">
          Create Campaign
        </button>
      </form>
    </div>
  );
};

export default CampaignCreation;
