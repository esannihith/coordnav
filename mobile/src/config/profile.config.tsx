import React from 'react';
import { Text } from 'react-native';
import { Moon, Bell, HelpCircle, Info } from 'lucide-react-native';

export type ProfileActionType = 'theme' | 'notifications' | 'help' | 'about';

export interface ProfileRowItem {
  id: ProfileActionType;
  iconBg: string;
  icon: React.ReactNode;
  label: string;
  labelColor?: string;
  right?: React.ReactNode;
  disabled?: boolean;
}

export interface ProfileGroup {
  id: string;
  items: ProfileRowItem[];
}

export const ComingSoon = () => (
  <Text className="text-xs text-gray-500">Coming soon</Text>
);

export const staticProfileGroups: ProfileGroup[] = [
  {
    id: 'preferences',
    items: [
      {
        id: 'theme',
        iconBg: 'bg-[#1a2535]',
        icon: <Moon size={16} color="#cbd5e1" />,
        label: 'Theme',
        right: <ComingSoon />,
      },
      {
        id: 'notifications',
        iconBg: 'bg-[#2a1f0a]',
        icon: <Bell size={16} color="#facc15" />,
        label: 'Notifications',
        right: <ComingSoon />,
      },
    ],
  },
  {
    id: 'support',
    items: [
      {
        id: 'help',
        iconBg: 'bg-[#1a2535]',
        icon: <HelpCircle size={16} color="#cbd5e1" />,
        label: 'Help & Feedback',
        right: <ComingSoon />,
      },
      {
        id: 'about',
        iconBg: 'bg-[#1a2535]',
        icon: <Info size={16} color="#cbd5e1" />,
        label: 'About CoordNav',
        right: <ComingSoon />,
      },
    ],
  },
];
