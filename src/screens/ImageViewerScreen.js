// src/screens/ImageViewerScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  Image,
  Animated,
  Easing,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function ImageViewerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const imagesParam = route?.params?.images ?? [];
  const startIndexParam = route?.params?.startIndex ?? 0;

  const images = useMemo(
    () => (Array.isArray(imagesParam) ? imagesParam.filter(Boolean) : []),
    [imagesParam],
  );

  const startIndex = Math.min(
    Math.max(startIndexParam, 0),
    Math.max(images.length - 1, 0),
  );

  const [activeIndex, setActiveIndex] = useState(startIndex);
  const listRef = useRef(null);

  const opacity = useRef(new Animated.Value(0)).current;

  // tap vs swipe detection
  const touchStart = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const isDragging = useRef(false);

  useEffect(() => {
    // pe iOS, statusbar light
    try {
      StatusBar.setBarStyle("light-content");
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("rgba(0,0,0,0.35)");
        StatusBar.setTranslucent(true);
      }
    } catch {}

    Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex?.({ index: startIndex, animated: false });
    });

    return () => {
      try {
        StatusBar.setBarStyle("dark-content");
      } catch {}
    };
  }, [opacity, startIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const idx = viewableItems[0]?.index ?? 0;
      setActiveIndex(idx);
    }
  }).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const close = () => navigation.goBack();

  const handleTouchStart = (e) => {
    const { pageX, pageY } = e.nativeEvent;
    touchStart.current = { x: pageX, y: pageY };
    moved.current = false;
  };

  const handleTouchMove = (e) => {
    const { pageX, pageY } = e.nativeEvent;
    const dx = Math.abs(pageX - touchStart.current.x);
    const dy = Math.abs(pageY - touchStart.current.y);
    if (dx > 8 || dy > 8) moved.current = true;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current && !moved.current) close();
  };

  return (
    <Animated.View style={[styles.root, { opacity }]}>
      {/* top bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={{ width: 110 }} />

        <Text style={styles.counter}>
          {images.length ? `${activeIndex + 1}/${images.length}` : ""}
        </Text>

        <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
          <Text style={styles.closeX}>×</Text>
        </Pressable>
      </View>

      {/* carousel fullscreen */}
      <FlatList
        ref={listRef}
        data={images}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScrollBeginDrag={() => {
          isDragging.current = true;
        }}
        onScrollEndDrag={() => {
          setTimeout(() => {
            isDragging.current = false;
          }, 120);
        }}
        onMomentumScrollEnd={() => {
          isDragging.current = false;
        }}
        renderItem={({ item: uri }) => (
          <View style={styles.page}>
            <Image source={{ uri }} style={styles.image} resizeMode="contain" />
          </View>
        )}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  counter: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 0.5,
  },

  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 26,
    marginTop: -2,
  },

  page: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
  },

  image: {
    width: "100%",
    height: "100%",
  },
});
