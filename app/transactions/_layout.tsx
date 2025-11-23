import { Stack } from "expo-router";

export default function TransactionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "700",
          color: "#0f172a",
        },
        contentStyle: {
          backgroundColor: "#f6fafb",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Transaksi Split Bill",
        }}
      />
      <Stack.Screen
        name="[recordId]"
        options={{
          title: "Detail Split Bill",
        }}
      />
    </Stack>
  );
}
