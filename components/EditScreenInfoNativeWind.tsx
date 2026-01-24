import React from 'react';
import { Text, View } from 'react-native';

import { ExternalLink } from './ExternalLink';
import { NativeWindMonoText } from './StyledText';

export default function EditScreenInfoNativeWind({ path }: { path: string }) {
  return (
    <View className="flex-1">
      <View className="items-center mx-12.5">
        {' '}
        {/* 50/4 = 12.5 */}
        <Text className="text-base leading-6 text-center text-gray-800 dark:text-gray-200 opacity-80">
          Open up the code for this screen:
        </Text>
        <View
          className="rounded bg-gray-200 dark:bg-gray-800 opacity-5 px-1 mx-1.75 my-1.75" // Approximate rgba values
        >
          <NativeWindMonoText>{path}</NativeWindMonoText>
        </View>
        <Text className="text-base leading-6 text-center text-gray-800 dark:text-gray-200 opacity-80">
          Change any of the text, save the file, and your app will automatically update.
        </Text>
      </View>

      <View className="mt-3.75 mx-5 items-center">
        {' '}
        {/* 15/4 = 3.75, 20/4 = 5 */}
        <View className="py-3.75">
          <ExternalLink href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet">
            <Text className="text-center text-blue-500">
              {' '}
              {/* Using default blue instead of theme color */}
              Tap here if your app doesn't automatically update after making changes
            </Text>
          </ExternalLink>
        </View>
      </View>
    </View>
  );
}
