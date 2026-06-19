import React from 'react';
import { View, Text } from 'react-native';

const JOIN_CODE_LENGTH = 6;

interface JoinCodeBoxesProps {
  value: string;
}

export function JoinCodeBoxes({ value }: JoinCodeBoxesProps) {
  const chars = value.padEnd(JOIN_CODE_LENGTH, ' ').split('').slice(0, JOIN_CODE_LENGTH);
  return (
    <View className="flex-row justify-center gap-1.5">
      {chars.map((ch, i) => {
        const filled = ch !== ' ';
        return (
          <View
            key={i}
            className={`w-9 h-11 rounded-lg items-center justify-center border ${
              filled ? 'bg-background border-primary' : 'bg-secondary/60 border-border'
            }`}
            style={filled ? { borderWidth: 1.5 } : undefined}
          >
            {filled && <Text className="text-foreground text-lg font-bold">{ch}</Text>}
          </View>
        );
      })}
    </View>
  );
}
