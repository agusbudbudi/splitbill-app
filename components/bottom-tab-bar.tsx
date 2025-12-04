import { Link, usePathname } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HomeIcon } from "@/components/ui/home-icon";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ReceiptIcon } from "@/components/ui/receipt-icon";
import { ScanIcon } from "@/components/ui/scan-icon";
import { useThemeColor } from "@/hooks/use-theme-color";

const menuItems = [
  {
    name: "Home",
    path: "/",
    icon: "house.fill",
  },
  {
    name: "Scan AI",
    path: "/scan",
    icon: "qr.code.viewfinder",
  },
  {
    name: "Transactions",
    path: "/transactions",
    icon: "list.bullet.rectangle.portrait",
  },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { bottom } = useSafeAreaInsets();
  const tabIconSelected = useThemeColor({}, "tabIconSelected");
  const tabIconDefault = useThemeColor({}, "tabIconDefault");
  const tint = useThemeColor({}, "tint");
  const background = useThemeColor({}, "background");

  const isVisible = ["/", "/scan", "/transactions"].includes(pathname);

  if (!isVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { bottom: bottom + 16, backgroundColor: background },
      ]}
    >
      {menuItems.map((item) => {
        const isActive = pathname === item.path;
        const isScan = item.name === "Scan AI";
        const isHome = item.name === "Home";
        const isTransactions = item.name === "Transactions";
        return (
          <Link key={item.name} href={item.path} asChild>
            <TouchableOpacity style={styles.tab}>
              {isScan ? (
                <View
                  style={[styles.scanIconContainer, { backgroundColor: tint }]}
                >
                  <ScanIcon color="white" size={26} />
                </View>
              ) : isHome ? (
                <View style={[styles.homeIconContainer]}>
                  <HomeIcon
                    color={isActive ? tabIconSelected : tabIconDefault}
                    size={22}
                  />
                </View>
              ) : isTransactions ? (
                <View style={[styles.transactionsIconContainer]}>
                  <ReceiptIcon
                    color={isActive ? tabIconSelected : tabIconDefault}
                    size={22}
                  />
                </View>
              ) : (
                <IconSymbol
                  name={item.icon}
                  color={isActive ? tabIconSelected : tabIconDefault}
                  size={22}
                />
              )}
            </TouchableOpacity>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: "44%",
    bottom: 48,
    left: "28%",
    right: "28%",
    flexDirection: "row",
    justifyContent: "center",
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 15,
    alignItems: "center",
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scanIconContainer: {
    borderRadius: 999,
    padding: 10,
  },
  homeIconContainer: {
    borderRadius: 999,
  },
  transactionsIconContainer: {
    borderRadius: 999,
  },
});
