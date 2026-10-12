import SwiftUI

@main
struct DemoApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @AppStorage("tapCount") private var tapCount = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Image(systemName: "hand.tap.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(.blue)
                    .accessibilityHidden(true)

                Text("Mano pirmoji programėlė")
                    .font(.largeTitle.bold())
                    .multilineTextAlignment(.center)

                Text("Sukurta su SwiftUI. Veikia tavo iPhone.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Text("\(tapCount)")
                    .font(.system(size: 72, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .accessibilityLabel("Paspaudimų skaičius: \(tapCount)")

                Button {
                    if tapCount < Int.max { tapCount += 1 }
                } label: {
                    Label("Paspausk mane", systemImage: "plus")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)

                Button("Pradėti iš naujo", role: .destructive) {
                    tapCount = 0
                }
                .buttonStyle(.bordered)
                .disabled(tapCount == 0)

                Text("Skaičius išlieka ir uždarius programėlę.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(28)
        }
    }
}
