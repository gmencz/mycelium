export default function SectionShadow() {
  return (
    <div
      className="bg-gray-800 h-[1400px] w-[4000px] absolute z-10"
      style={{
        left: "calc(50% - 4000px / 2)",
        borderRadius: "100%",
        background:
          "linear-gradient(180deg, rgba(23, 23, 23, 1) 0%, rgba(5, 5, 5, 1) 40%)",
      }}
    />
  );
}
