import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditScreen() {
  const { id, title, content } = useLocalSearchParams();
  const router = useRouter();

  const [noteTitle, setNoteTitle] = useState((title as string) || '');
  const [noteContent, setNoteContent] = useState((content as string) || '');

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* 自定义 Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="ellipsis-vertical" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 标题输入区 */}
        <TextInput
          style={styles.titleInput}
          value={noteTitle}
          onChangeText={setNoteTitle}
          placeholder="标题"
          placeholderTextColor="#888"
          underlineColorAndroid="transparent"
          selectionColor="#00000000"
          caretHidden={false}
        />

        {/* 内容书写区 */}
        <TextInput
          style={styles.contentInput}
          value={noteContent}
          onChangeText={setNoteContent}
          placeholder="开始书写笔记"
          placeholderTextColor="#888"
          multiline={true}
          textAlignVertical="top"
          underlineColorAndroid="transparent"
          selectionColor="#00000000"
          caretHidden={false}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 15,
    padding: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 0,
    marginVertical: 10,
    borderWidth: 0,
    outlineWidth: 0,
    borderStyle: 'solid',
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFC107',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  buttonIcon: {
    marginRight: 5,
  },
  createButtonText: {
    color: '#FFC107',
    fontSize: 14,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    textAlignVertical: 'top',
    borderWidth: 0,
    outlineWidth: 0,
    borderStyle: 'solid',
  },
});
