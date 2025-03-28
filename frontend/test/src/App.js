import logo from "./logo.svg";
import "./App.css";
import React, { useState, useEffect } from "react";
import Razorpay from "razorpay-checkout";
import { toast } from "react-toastify";

function App() {
  useEffect(() => {
    localStorage.setItem(
      "token",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZTNjMGMzZDFhOTgyZjQ5ZGMxMTRiOSIsImlhdCI6MTc0MzE3NTc0MiwiZXhwIjoxNzQzMTc5MzQyfQ.IrE3AU4CWdI65uh00XutOpwHRd7pI6qxFdeywrA6FpY"
    );
  }, []);

  return (
    <div className="App">
      <CreateCampaignForm />
      <CampaignsList />
    </div>
  );
}

const CampaignsList = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, [filter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/v1/campaigns${
          filter ? `?status=${filter}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      setCampaigns(data.data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch campaigns");
      setLoading(false);
    }
  };

  const participateInCampaign = async (campaignId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/campaigns/${campaignId}/participate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({}),
        }
      );
      const data = await response.json();

      // If campaign requires payment
      if (data.razorpayOrder) {
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID,
          amount: data.razorpayOrder.amount,
          currency: data.razorpayOrder.currency,
          name: "Campaign Participation",
          description: "Campaign Participation Fee",
          order_id: data.razorpayOrder.id,
          handler: async (paymentResponse) => {
            try {
              const verifyResponse = await fetch(
                "http://localhost:8000/api/v1/campaigns/verify-participation-payment",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                  body: JSON.stringify({
                    campaignId: campaignId,
                    razorpayOrderId: paymentResponse.razorpay_order_id,
                    razorpayPaymentId: paymentResponse.razorpay_payment_id,
                    razorpaySignature: paymentResponse.razorpay_signature,
                  }),
                }
              );
              await verifyResponse.json();
              toast.success("Successfully participated in campaign!");
              fetchCampaigns(); // Refresh campaigns list
            } catch (verificationError) {
              toast.error("Payment verification failed");
            }
          },
          prefill: {
            name: localStorage.getItem("userName"),
            email: localStorage.getItem("userEmail"),
          },
          theme: {
            color: "#3399cc",
          },
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
      } else {
        toast.success("Successfully participated in campaign!");
        fetchCampaigns(); // Refresh campaigns list
      }
    } catch (error) {
      toast.error(
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
          "Failed to participate"
      );
    }
  };

  if (loading) {
    return <div>Loading campaigns...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Campaigns</h2>

      <div className="mb-4 flex space-x-2">
        <button
          onClick={() => setFilter("")}
          className={`px-4 py-2 rounded ${
            filter === "" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("upcoming")}
          className={`px-4 py-2 rounded ${
            filter === "upcoming" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-2 rounded ${
            filter === "active" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter("finished")}
          className={`px-4 py-2 rounded ${
            filter === "finished" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Finished
        </button>
      </div>

      {campaigns.length === 0 ? (
        <p>No campaigns found.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <div key={campaign._id} className="border rounded-lg p-4 shadow-md">
              <h3 className="text-xl font-semibold mb-2">{campaign.name}</h3>
              <p className="text-gray-600 mb-2">{campaign.description}</p>
              <div className="mb-2">
                <strong>Status:</strong> {campaign.status}
              </div>
              <div className="mb-2">
                <strong>Dates:</strong>{" "}
                {new Date(campaign.startDate).toLocaleDateString()} -{" "}
                {new Date(campaign.endDate).toLocaleDateString()}
              </div>
              {campaign.isPaid && (
                <div className="mb-2 text-green-600">
                  Participation Fee: ₹{campaign.participationFee}
                </div>
              )}
              <div className="mb-2">
                <strong>Participants:</strong> {campaign.participants.length}
                {campaign.maxParticipants && ` / ${campaign.maxParticipants}`}
              </div>
              <button
                onClick={() => participateInCampaign(campaign._id)}
                disabled={campaign.status !== "active"}
                className={`w-full py-2 rounded ${
                  campaign.status === "active"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                {campaign.status === "active"
                  ? campaign.isPaid
                    ? "Participate (Paid)"
                    : "Participate"
                  : "Not Active"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CreateCampaignForm = () => {
  const [campaignData, setCampaignData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    isPaid: false,
    participationFee: 0,
    banner: null,
    maxParticipants: null,
  });

  const handleInputChange = (e) => {
    // const { name, value, type, checked, files } = e.target;
    // setCampaignData((prev) => ({
    //   ...prev,
    //   [name]:
    //     type === "checkbox" ? checked : type === "file" ? files[0] : value,
    // }));
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      // Prepare form data
      //const formData = new FormData();
      // Object.keys(campaignData).forEach((key) => {
      //   formData.append(key, campaignData[key]);
      // });
      console.log(localStorage.getItem("token"));
     
      let formData = {
        name: "Clean City Drive",
        description: "Community cleanup campaign",
        startDate: "2024-06-01",
        creator: "67e3c0c3d1a982f49dc114b9",
        endDate: "2024-06-30",
        isPaid: true,
        participationFee: 50,
      };
      console.log(formData);
      // Send campaign creation request
      const response = await fetch("http://localhost:8000/api/v1/campaigns", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
      const data = await response.json();

      // If campaign requires launch payment
      if (data.razorpayOrder) {
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID,
          amount: data.razorpayOrder.amount,
          currency: data.razorpayOrder.currency,
          name: "Campaign Launch",
          description: "Campaign Launch Fee",
          order_id: data.razorpayOrder.id,
          handler: async (paymentResponse) => {

            try {
              const verifyResponse = await fetch(
                "http://localhost:8000/api/v1/campaigns/verify-launch-payment",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                  body: JSON.stringify({
                    campaignId: data.data.campaign._id,
                    razorpayOrderId: paymentResponse.razorpay_order_id,
                    razorpayPaymentId: paymentResponse.razorpay_payment_id,
                    razorpaySignature: paymentResponse.razorpay_signature,
                  }),
                }
              );
              await verifyResponse.json();
              toast.success("Campaign created successfully!");
              // Redirect or update state as needed
            } catch (verificationError) {
              toast.error("Payment verification failed");
            }
          },
          prefill: {
            name: localStorage.getItem("user").first_name,
            email: localStorage.getItem("user").email,
          },
          theme: {
            color: "#3399cc",
          },
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
      } else {
        toast.success("Campaign created successfully!");
        // Redirect or update state as needed
      }
    } catch (error) {
      toast.error(
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
          "Campaign creation failed"
      );
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Create Campaign</h2>
      <form onSubmit={handleCreateCampaign}>
        <div className="mb-4">
          <label className="block mb-2">Campaign Name</label>
          <input
            type="text"
            name="name"
            value={campaignData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <button
          type="submit"
          onClick={handleCreateCampaign}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
        >
          Create Campaign
        </button>
      </form>
    </div>
  );
};

export default App;
