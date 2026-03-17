"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { Card } from "../components/ui";
import { 
  User, 
  Pencil, 
  FloppyDisk, 
  X, 
  Globe, 
  MapPin,
  Envelope,
  GithubLogo,
  LinkedinLogo,
  TwitterLogo,
  ArrowSquareOut,
  SquaresFour
} from "phosphor-react";
import { apiClient, PoWProfile } from "../lib/api";
import toast from "react-hot-toast";

interface ProfileData {
  username: string;
  displayName: string;
  email: string;
  bio: string;
  location: string;
  website: string;
  linkedin: string;
  twitter: string;
  github: string;
}

export default function ProfileManagementPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<PoWProfile | null>(null);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    username: "",
    displayName: "",
    email: "",
    bio: "",
    location: "",
    website: "",
    linkedin: "",
    twitter: "",
    github: "",
  });

  useEffect(() => {
    const storedUsername = localStorage.getItem("github_username");
    const storedEmail = localStorage.getItem("github_email");
    const storedAvatar = localStorage.getItem("github_avatar_url");
    
    if (storedUsername) {
      setUsername(storedUsername);
      setDisplayName(storedUsername);
      setProfileData(prev => ({
        ...prev,
        username: storedUsername,
        displayName: storedUsername,
        email: storedEmail || "",
        github: `https://github.com/${storedUsername}`,
      }));
    }
    if (storedEmail) {
      setUserEmail(storedEmail);
    }
    if (storedAvatar) {
      setAvatarUrl(storedAvatar);
    }

    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("github_token");
      const storedUsername = localStorage.getItem("github_username");
      
      if (token && storedUsername) {
        try {
          const profileData = await apiClient.getUserProfile(storedUsername, token);
          setProfile(profileData);
        } catch (error) {
          console.error("Failed to load profile:", error);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      localStorage.setItem("profile_displayName", profileData.displayName);
      localStorage.setItem("profile_bio", profileData.bio);
      localStorage.setItem("profile_location", profileData.location);
      localStorage.setItem("profile_website", profileData.website);
      localStorage.setItem("profile_linkedin", profileData.linkedin);
      localStorage.setItem("profile_twitter", profileData.twitter);
      
      setDisplayName(profileData.displayName);
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData(prev => ({
      ...prev,
      displayName: localStorage.getItem("profile_displayName") || prev.username,
      bio: localStorage.getItem("profile_bio") || "",
      location: localStorage.getItem("profile_location") || "",
      website: localStorage.getItem("profile_website") || "",
      linkedin: localStorage.getItem("profile_linkedin") || "",
      twitter: localStorage.getItem("profile_twitter") || "",
    }));
    setEditing(false);
  };

  useEffect(() => {
    setProfileData(prev => ({
      ...prev,
      displayName: localStorage.getItem("profile_displayName") || prev.username,
      bio: localStorage.getItem("profile_bio") || "",
      location: localStorage.getItem("profile_location") || "",
      website: localStorage.getItem("profile_website") || "",
      linkedin: localStorage.getItem("profile_linkedin") || "",
      twitter: localStorage.getItem("profile_twitter") || "",
    }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c0f] flex">
        <Sidebar 
          username={username} 
          email={userEmail || undefined}
          displayName={displayName}
        />
        <div className="flex-1 overflow-y-auto flex items-center justify-center ml-60">
          <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c0f] flex">
      <Sidebar 
        username={username} 
        email={userEmail || undefined}
        displayName={displayName}
      />

      <div className="flex-1 overflow-y-auto ml-60">
        <div className="max-w-[900px] mx-auto px-6 py-6">
          {/* Profile Header Card */}
          <Card className="p-6 rounded-[16px] mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center overflow-hidden border-2 border-[rgba(255,255,255,0.08)]">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={displayName || username} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" weight="regular" />
                  )}
                </div>
                
                {/* Name & Info */}
                <div>
                  <h1 className="text-xl font-semibold text-white mb-1">
                    {profileData.displayName || profileData.username}
                  </h1>
                  <p className="text-sm text-gray-400 mb-2">@{profileData.username}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {profileData.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" weight="regular" />
                        {profileData.location}
                      </span>
                    )}
                    {profileData.email && (
                      <span className="flex items-center gap-1">
                        <Envelope className="w-3.5 h-3.5" weight="regular" />
                        {profileData.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-gray-300 text-sm transition-colors border border-[rgba(255,255,255,0.06)]"
                >
                  <Pencil className="w-4 h-4" weight="regular" />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)] text-gray-400 text-sm transition-colors border border-[rgba(255,255,255,0.04)]"
                  >
                    <X className="w-4 h-4" weight="regular" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FF5500]/20 hover:bg-[#FF5500]/30 text-[#FF6B2B] text-sm transition-colors border border-[#FF5500]/30 disabled:opacity-50"
                  >
                    <FloppyDisk className="w-4 h-4" weight="regular" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            {/* Bio */}
            {editing ? (
              <div className="mt-4">
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-[12px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF5500]/50 resize-none"
                  placeholder="Write a short bio about yourself..."
                />
              </div>
            ) : profileData.bio ? (
              <p className="mt-4 text-sm text-gray-300 leading-relaxed">{profileData.bio}</p>
            ) : null}

            {/* Social Links Row */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
              <a
                href={profileData.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white text-xs transition-colors"
              >
                <GithubLogo className="w-4 h-4" weight="fill" />
                GitHub
              </a>
              {profileData.linkedin && (
                <a
                  href={profileData.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-gray-400 hover:text-[#FF6B2B] text-xs transition-colors"
                >
                  <LinkedinLogo className="w-4 h-4" weight="fill" />
                  LinkedIn
                </a>
              )}
              {profileData.twitter && (
                <a
                  href={profileData.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white text-xs transition-colors"
                >
                  <TwitterLogo className="w-4 h-4" weight="fill" />
                  Twitter
                </a>
              )}
              {profileData.website && (
                <a
                  href={profileData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-gray-400 hover:text-emerald-400 text-xs transition-colors"
                >
                  <Globe className="w-4 h-4" weight="regular" />
                  Website
                </a>
              )}
            </div>
          </Card>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Edit Profile */}
            <Card className="p-5 rounded-[16px]">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-violet-400" weight="fill" />
                <h2 className="text-sm font-medium text-violet-400">Profile Details</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Display Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-[10px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF5500]/50"
                      placeholder="Your display name"
                    />
                  ) : (
                    <p className="text-sm text-gray-200">{profileData.displayName || profileData.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Location</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 rounded-[10px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF5500]/50"
                      placeholder="City, Country"
                    />
                  ) : (
                    <p className="text-sm text-gray-200">{profileData.location || "Not specified"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Website</label>
                  {editing ? (
                    <input
                      type="url"
                      value={profileData.website}
                      onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 rounded-[10px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF5500]/50"
                      placeholder="https://yourwebsite.com"
                    />
                  ) : (
                    <p className="text-sm text-gray-200">{profileData.website || "Not provided"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">LinkedIn</label>
                  {editing ? (
                    <input
                      type="url"
                      value={profileData.linkedin}
                      onChange={(e) => setProfileData(prev => ({ ...prev, linkedin: e.target.value }))}
                      className="w-full px-3 py-2 rounded-[10px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF5500]/50"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  ) : (
                    <p className="text-sm text-gray-200">{profileData.linkedin || "Not provided"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Twitter/X</label>
                  {editing ? (
                    <input
                      type="url"
                      value={profileData.twitter}
                      onChange={(e) => setProfileData(prev => ({ ...prev, twitter: e.target.value }))}
                      className="w-full px-3 py-2 rounded-[10px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF5500]/50"
                      placeholder="https://twitter.com/yourhandle"
                    />
                  ) : (
                    <p className="text-sm text-gray-200">{profileData.twitter || "Not provided"}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Right Column - Stats & Actions */}
            <div className="space-y-6">
              {/* PoW Index Card */}
              {profile && (
                <Card className="p-5 rounded-[16px]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-4 h-4 rounded-full bg-[#FF5500]" />
                    <h2 className="text-sm font-medium text-[#FF6B2B]">PoW Index</h2>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold text-white">{profile.overallIndex}</p>
                      <p className="text-xs text-gray-500 mt-1">Overall Score</p>
                    </div>
                    <button
                      onClick={() => router.push(`/u/${username}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5500]/10 hover:bg-[#FF5500]/20 text-[#FF6B2B] text-xs transition-colors"
                    >
                      <ArrowSquareOut className="w-3.5 h-3.5" weight="regular" />
                      Public Profile
                    </button>
                  </div>
                </Card>
              )}

              {/* Quick Actions Card */}
              <Card className="p-5 rounded-[16px]">
                <div className="flex items-center gap-2 mb-4">
                  <SquaresFour className="w-4 h-4 text-emerald-400" weight="fill" />
                  <h2 className="text-sm font-medium text-emerald-400">Quick Actions</h2>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push(`/u/${username}`)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] text-sm text-gray-300 hover:text-white transition-colors border border-[rgba(255,255,255,0.04)]"
                  >
                    <span>View Public Profile</span>
                    <ArrowSquareOut className="w-4 h-4 text-gray-500" weight="regular" />
                  </button>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] text-sm text-gray-300 hover:text-white transition-colors border border-[rgba(255,255,255,0.04)]"
                  >
                    <span>Go to Dashboard</span>
                    <SquaresFour className="w-4 h-4 text-gray-500" weight="regular" />
                  </button>
                </div>
              </Card>

              {/* Account Info Card */}
              <Card className="p-5 rounded-[16px]">
                <div className="flex items-center gap-2 mb-4">
                  <GithubLogo className="w-4 h-4 text-gray-400" weight="fill" />
                  <h2 className="text-sm font-medium text-gray-400">Connected Account</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Username</span>
                    <span className="text-gray-300">@{profileData.username}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-300">{profileData.email || "Hidden"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Provider</span>
                    <span className="text-gray-300 flex items-center gap-1">
                      <GithubLogo className="w-3.5 h-3.5" weight="fill" />
                      GitHub OAuth
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


