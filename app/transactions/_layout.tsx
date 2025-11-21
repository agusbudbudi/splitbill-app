import { Stack } from "expo-router";

export default function TransactionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
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
