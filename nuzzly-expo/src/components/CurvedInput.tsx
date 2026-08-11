import React, {
 useState,
 useMemo,
 useRef,
 useImperativeHandle,
 forwardRef,
 useEffect,
} from 'react';
import {
 View,
 TextInput,
 TouchableOpacity,
 LayoutChangeEvent,
 StyleSheet,
} from 'react-native';
import Svg, { Path, Defs, TextPath, Text, G, ClipPath, Line, Circle } from 'react-native-svg';

// ── Geometry (ported from web/components/ui/curved-in.tsx) ──

const DEG = 180 / Math.PI;
const round2 = (n: number) => Math.round(n * 100) / 100;

interface Geom {
 straight: boolean;
 W: number;
 T: number;
 svgH: number;
 R: number;
 dir: number;
 uPerLen: number;
 point: (u: number, v: number) => [number, number];
 angleAt: (u: number) => number;
}

function buildGeometry(width: number, bend: number, thickness: number, pad: number): Geom | null {
 const W = width;
 if (W < 2) return null;
 const T = thickness;
 const s = Math.max(-W * 0.35, Math.min(bend, W * 0.35));
 const a = Math.abs(s);
 const dir = s >= 0 ? 1 : -1;
 const svgH = T + a + pad * 2;

 if (a < 0.75) {
 const midY = pad + T / 2;
 return {
 straight: true,
 W, T, svgH, R: 0, dir, uPerLen: 1,
 point: (u, v) => [u, midY + v],
 angleAt: () => 0,
 };
 }

 const R = (W * W * 0.25 + a * a) / (2 * a);
 const cx = W / 2;
 const apexY = pad + T / 2 + (dir > 0 ? 0 : a);
 const cy = apexY + dir * R;
 const phi = Math.asin(Math.min(1, W / (2 * R)));

 return {
 straight: false,
 W, T, svgH, R, dir, uPerLen: W / (2 * R * phi),
 point: (u, v) => {
 const th = ((u - cx) / cx) * phi;
 const rho = R - dir * v;
 return [cx + rho * Math.sin(th), cy - dir * rho * Math.cos(th)];
 },
 angleAt: (u) => dir * ((u - cx) / cx) * phi * DEG,
 };
}

function fmt(g: Geom, u: number, v: number): string {
 const [x, y] = g.point(u, v);
 return `${round2(x)} ${round2(y)}`;
}

function edgeSeg(g: Geom, uTo: number, v: number, ltr: boolean): string {
 if (g.straight) return `L ${fmt(g, uTo, v)}`;
 const rho = round2(g.R - g.dir * v);
 const sweep = ltr === (g.dir > 0) ? 1 : 0;
 return `A ${rho} ${rho} 0 0 ${sweep} ${fmt(g, uTo, v)}`;
}

function bentRectPath(
 g: Geom,
 u0: number,
 u1: number,
 vTop: number,
 vBot: number,
 radius: number,
): string {
 const rc = Math.max(0, Math.min(radius, (vBot - vTop) / 2, (u1 - u0) / 2));
 return [
 `M ${fmt(g, u0 + rc, vTop)}`,
 edgeSeg(g, u1 - rc, vTop, true),
 `Q ${fmt(g, u1, vTop)} ${fmt(g, u1, vTop + rc)}`,
 `L ${fmt(g, u1, vBot - rc)}`,
 `Q ${fmt(g, u1, vBot)} ${fmt(g, u1 - rc, vBot)}`,
 edgeSeg(g, u0 + rc, vBot, false),
 `Q ${fmt(g, u0, vBot)} ${fmt(g, u0, vBot - rc)}`,
 `L ${fmt(g, u0, vTop + rc)}`,
 `Q ${fmt(g, u0, vTop)} ${fmt(g, u0 + rc, vTop)}`,
 'Z',
 ].join(' ');
}

function bentLinePath(g: Geom, u0: number, u1: number, v: number): string {
 return `M ${fmt(g, u0, v)} ${edgeSeg(g, u1, v, true)}`;
}

// ── Text width estimation (approximation of SVG getComedTextLength) ──

function estimateTextWidth(text: string, fontSize: number): number {
 let w = 0;
 for (const ch of text) {
 if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)) {
 w += fontSize * 1.0;
 } else if (/[0-9]/.test(ch)) {
 w += fontSize * 0.6;
 } else if (/[A-Z]/.test(ch)) {
 w += fontSize * 0.65;
 } else if (/[a-z]/.test(ch)) {
 w += fontSize * 0.5;
 } else if (ch === ' ') {
 w += fontSize * 0.3;
 } else {
 w += fontSize * 0.5;
 }
 }
 return w;
}

// ── Component ──

export interface CurvedInHandle {
 focus: () => void;
 blur: () => void;
}

export interface CurvedInProps {
 value: string;
 onChangeText: (text: string) => void;
 onSubmit?: () => void;
 placeholder?: string;
 buttonText?: string;
 onButtonPress?: () => void;
 buttonDisabled?: boolean;
 secureTextEntry?: boolean;
 keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad' | 'numeric' | 'url';
 maxLength?: number;
 autoFocus?: boolean;
 width?: number | string;
 bend?: number;
 height?: number;
 cornerRadius?: number;
 borderWidth?: number;
 fontSize?: number;
 backgroundColor?: string;
 textColor?: string;
 placeholderColor?: string;
 borderColor?: string;
 buttonColor?: string;
 buttonTextColor?: string;
 shadowColor?: string;
 showButton?: boolean;
 editable?: boolean;
 returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send' | 'none' | 'previous' | 'default';
 blurOnSubmit?: boolean;
 style?: any;
}

let _idCounter = 0;

export const CurvedIn = forwardRef<CurvedInHandle, CurvedInProps>(
 function CurvedIn(props, ref) {
 const {
 value,
 onChangeText,
 onSubmit,
 placeholder = '',
 buttonText = '',
 onButtonPress,
 buttonDisabled = false,
 secureTextEntry = false,
 keyboardType = 'default',
 maxLength,
 autoFocus = false,
 width = '100%',
 bend = 12,
 height = 52,
 cornerRadius = 16,
 borderWidth = 1.5,
 fontSize = 14,
 backgroundColor = '#ffffff',
 textColor = '#111111',
 placeholderColor = '#b0b0b0',
 borderColor = '#e5e5e5',
 buttonColor = '#FF7A59',
 buttonTextColor = '#ffffff',
 shadowColor = '#FF7A59',
 showButton = true,
 editable = true,
 returnKeyType = 'done',
 blurOnSubmit = false,
 style,
 } = props;

 const [w, setW] = useState(0);
 const [focused, setFocused] = useState(false);
 const inRef = useRef<TextInput>(null);

 // Unique IDs for SVG path references
 const uid = useMemo(() => `ci${++_idCounter}`, []);
 const layoutPathId = `${uid}-text`;
 const buttonPathId = `${uid}-btn`;
 const clipId = `${uid}-clip`;

 useImperativeHandle(ref, () => ({
 focus: () => inRef.current?.focus(),
 blur: () => inRef.current?.blur(),
 }));

  const onLayout = (e: LayoutChangeEvent) => {
 setW(e.nativeEvent.layout.width);
 };

 useEffect(() => {
 if (autoFocus) {
 const t = setTimeout(() => inRef.current?.focus(), 100);
 return () => clearTimeout(t);
 }
 }, [autoFocus]);

 // ── Geometry (matches web buildGeometry) ──
 const pad = Math.ceil(borderWidth / 2) + 6;
 const geom = useMemo(
 () => buildGeometry(w, bend, height, pad),
 [w, bend, height, pad],
 );

 // ── Button text width estimation ──
 const btnTextWidth = useMemo(
 () => estimateTextWidth(buttonText, fontSize),
 [buttonText, fontSize],
 );

 // ── Layout (matches web's layout useMemo) ──
 const layout = useMemo(() => {
 if (!geom) return null;
 const T = height;
 const btnInset = Math.max(5, borderWidth + 4);
 const btnW = showButton
 ? Math.max(btnTextWidth + fontSize * 2.7, T * 1.35)
 : 0;
 const btnU1 = geom.W - btnInset;
 const btnU0 = btnU1 - btnW;
 const textStartU = 24;
 const textEndU = Math.max(textStartU + 20, showButton ? btnU0 - 14 : geom.W - 24);
 const winLen = (textEndU - textStartU) / geom.uPerLen;
 return { btnInset, btnW, textStartU, textEndU, btnU0, btnU1, winLen };
 }, [geom, height, borderWidth, btnTextWidth, fontSize, showButton]);

 if (!geom || !layout) {
 return (
 <View
 style={{ width, height: height + pad * 2 + Math.abs(bend), ...style }}
 onLayout={onLayout}
 />
 );
 }

 // ── SVG paths (matches web's content rendering) ──
 const T = height;
 // vBase: vertical offset for text baseline (matches web: fontSize * 0.34)
 const vBase = fontSize * 0.34;

 const bandPath = bentRectPath(geom, 0, geom.W, -T / 2, T / 2, cornerRadius);
 // Text path follows the curve at vBase offset (matches web)
 const layoutPath = bentLinePath(geom, layout.textStartU, geom.W, vBase);
 // Clip path for text area
 const clipPath = bentRectPath(geom, layout.textStartU - 6, layout.textEndU + 8, -T / 2, T / 2, 0);

 const btnH = T - layout.btnInset * 2;
 const buttonPath = showButton
 ? bentRectPath(
 geom,
 layout.btnU0,
 layout.btnU1,
 -T / 2 + layout.btnInset,
 T / 2 - layout.btnInset,
 Math.min(cornerRadius * 0.72, btnH / 2),
 )
 : '';
 // Button text path (matches web: follows curve at vBase)
 const buttonTextPath = showButton
 ? bentLinePath(geom, layout.btnU0, layout.btnU1, vBase)
 : '';

 // Display text (password masking)
 const display = secureTextEntry ? '•'.repeat(value.length) : value;

 return (
 <View style={{ width, ...style }} onLayout={onLayout}>
 <View
 style={[
 styles.shadowContainer,
 {
 height: geom.svgH,
 width: geom.W,
 shadowColor: shadowColor,
 shadowOffset: { width: 0, height: 5 },
 shadowOpacity: 0.3,
 shadowRadius: 12,
 elevation: 3,
 },
 ]}
 >
 <Svg
 width={geom.W}
 height={geom.svgH}
 viewBox={`0 0 ${geom.W} ${round2(geom.svgH)}`}
 >
 <Defs>
 <Path id={layoutPathId} d={layoutPath} fill="none" />
 {showButton && <Path id={buttonPathId} d={buttonTextPath} fill="none" />}
 <ClipPath id={clipId}>
 <Path d={clipPath} />
 </ClipPath>
 </Defs>

 {/* Focus ring (matches web: opacity 0 → 0.28 on focus) */}
 {focused && (
 <Path
 d={bandPath}
 fill="none"
 stroke={buttonColor}
 strokeWidth={borderWidth + 6}
 opacity={0.28}
 />
 )}
 {/* Main band (background + border) */}
 <Path
 d={bandPath}
 fill={backgroundColor}
 stroke={borderColor}
 strokeWidth={borderWidth}
 />

 {/* Text and placeholder (rendered along curved path via TextPath) */}
 <G clipPath={`url(#${clipId})`}>
 {display ? (
 <Text
 fontSize={fontSize}
 fontWeight="500"
 fill={textColor}
 >
 <TextPath href={`#${layoutPathId}`}>
 {display}
 </TextPath>
 </Text>
 ) : placeholder ? (
 <Text
 fontSize={fontSize}
 fontWeight="500"
 fill={placeholderColor}
 >
 <TextPath href={`#${layoutPathId}`}>
 {placeholder}
 </TextPath>
 </Text>
 ) : null}
 </G>

 {/* Button with curved text (matches web) */}
 {showButton && (
 <G>
 <Path
 d={buttonPath}
 fill={buttonDisabled ? '#cccccc' : buttonColor}
 />
 <Text
 fill={buttonTextColor}
 textAnchor="middle"
 fontSize={fontSize}
 fontWeight="600"
 >
 <TextPath href={`#${buttonPathId}`} startOffset="50%">
 {buttonText}
 </TextPath>
 </Text>
 </G>
 )}
 </Svg>

 {/* Transparent TextInput overlay for keyboard interaction */}
 <TextInput
 ref={inRef}
 style={[
 styles.in,
 {
 left: layout.textStartU,
 right: showButton
 ? Math.max(0, geom.W - layout.textEndU)
 : 24,
 top: 0,
 height: geom.svgH,
 fontSize,
 color: 'transparent',
 },
 ]}
 value={value}
 onChangeText={onChangeText}
 placeholder=""
 secureTextEntry={secureTextEntry}
 keyboardType={keyboardType}
 maxLength={maxLength}
 onFocus={() => setFocused(true)}
 onBlur={() => setFocused(false)}
 onSubmitEditing={onSubmit}
 editable={editable}
 autoCapitalize="none"
 autoCorrect={false}
 returnKeyType={returnKeyType}
 blurOnSubmit={blurOnSubmit}
 />

 {/* Transparent button touch area */}
 {showButton && (
 <TouchableOpacity
 style={[
 styles.button,
 {
 right: layout.btnInset,
 top: 0,
 width: layout.btnW,
 height: geom.svgH,
 },
 ]}
 onPress={onButtonPress || onSubmit}
 disabled={buttonDisabled}
 activeOpacity={0.7}
 />
 )}
 </View>
 </View>
 );
 },
);

const styles = StyleSheet.create({
 shadowContainer: {
 position: 'relative',
 },
 in: {
 position: 'absolute',
 fontWeight: '500',
 padding: 0,
 borderWidth: 0,
 backgroundColor: 'transparent',
 textAlignVertical: 'center',
 },
 button: {
 position: 'absolute',
 },
});
