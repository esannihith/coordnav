import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useAlertStore, AlertAction } from '@/store/alert.store';

export function GlobalAlert() {
  const { visible, title, message, actions, hideAlert } = useAlertStore();

  if (!visible) return null;

  const handlePress = async (action: AlertAction) => {
    hideAlert();
    if (action.onPress) {
      try {
        await action.onPress();
      } catch (err) {
        console.error('Error executing alert press:', err);
      }
    }
  };

  const isTwoActions = actions.length === 2;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-6">
        <View className="w-full max-w-[300px] bg-[#1c1c1e] rounded-2xl overflow-hidden border border-[#2c2c2e]">
          {/* Content */}
          <View className="p-5 items-center">
            <Text className="text-white text-base font-bold text-center leading-5">
              {title}
            </Text>
            {message ? (
              <Text className="text-zinc-400 text-xs text-center mt-2.5 leading-4">
                {message}
              </Text>
            ) : null}
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-[#2c2c2e]" />

          {/* Action Buttons */}
          {isTwoActions ? (
            <View className="flex-row h-11">
              {actions.map((action, index) => {
                const isDestructive = action.style === 'destructive';
                const isCancel = action.style === 'cancel';
                let textClass = 'text-blue-500 font-semibold';
                if (isDestructive) textClass = 'text-rose-500 font-semibold';
                if (isCancel) textClass = 'text-zinc-400 font-normal';

                return (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      onPress={() => handlePress(action)}
                      className="flex-1 items-center justify-center h-full active:bg-[#2c2c2e]"
                    >
                      <Text className={`text-sm ${textClass}`}>
                        {action.text}
                      </Text>
                    </TouchableOpacity>
                    {index === 0 && <View className="w-[1px] h-full bg-[#2c2c2e]" />}
                  </React.Fragment>
                );
              })}
            </View>
          ) : (
            <View className="flex-col">
              {actions.map((action, index) => {
                const isDestructive = action.style === 'destructive';
                const isCancel = action.style === 'cancel';
                let textClass = 'text-blue-500 font-semibold';
                if (isDestructive) textClass = 'text-rose-500 font-semibold';
                if (isCancel) textClass = 'text-zinc-400 font-normal';

                return (
                  <View key={index} className="w-full">
                    <TouchableOpacity
                      onPress={() => handlePress(action)}
                      className="w-full h-11 items-center justify-center active:bg-[#2c2c2e]"
                    >
                      <Text className={`text-sm ${textClass}`}>
                        {action.text}
                      </Text>
                    </TouchableOpacity>
                    {index < actions.length - 1 && <View className="h-[1px] bg-[#2c2c2e]" />}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
