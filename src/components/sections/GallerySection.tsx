import { motion } from "framer-motion";

const images = [
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHKwQBp7Npja5PhFnEaZQbYvfCVY_nGQpfqlskFvsyQt4ITLSgMz0dGc2QlYQyKUdwJ1dSsaXTuK8iDE5UqziUnnrNM9MA_9CTV6vJnO-cE6wNqqHoJlsHB13J-CnPp1w6ruktKct9q2fqWw9s4-MIXWQ_TFaBZJGL22JpqKTdtsO2_TWpejiuKeYdP9Fx_gXtLmNL3yuyr2Y3sQQ4KeOTEjuTitTvblTEk0t0Ttbnfl19Npuwh8b_W6PoD1_l9L97xoikacJ5b0nu",
    alt: "Students engaged in outdoor sports on campus field",
    span: "row-span-2",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUeeA1ChjtHXvXeWTHtF8BFtGOutWtBLeSQ2EQXt2xzRMAxN4qBcI1m90xWEDFUvjdK0IFu2UFH8HrqWsdbV3DGEeTVQSBwpM9dwE6kQLr4e4gDv82tOerPrPl16wxQvIvZL-S4_NyO36EHi5Bi7sKMLqIZALjaa4OoopL7pAkjJPqNlWd7jf8UKquarUD3sOTmNKcDOpFfGfLfL0kKFbNLH1E-ABL89s1lGgTkChlhHBS9clfhj3HYpvZ08JYajXQaA8EF4G1NWTt",
    alt: "Students celebrating at graduation ceremony",
    span: "row-span-1",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuD0q8P8O2U7tf3aW_N05jqD3AifgusbpFBTPiwrehc_Vm5k5QzGzxN00EigNMcQCqs5nYI56wRbN_WqQKRokVfQ8o2TSubsz9YkL4NMzgW14GbYpanKjKEfXu8J5B5U2IYVorL9Asaqk5U5yLGUjWvc-Wvt9yhXAd9Q6Csek57Onc0A3sBctgrMxNFZP6bS03Xzg66Hkun1n0Ue4nwlk93kavBRd0ATk6l37NFPlbCFnsdYdBiZhIlt0bE8eyTx6t_Odj88x-jdJ2hk",
    alt: "Students practicing instruments in music room",
    span: "row-span-1",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDKlLu95vbOYfZcsPlL2n4tOKCPaa16YK9MjVVqUCwo99qEU5Te5427G12BBqjZ3rifsye7Lnl22XT3N-l51_WKOeMC0mRVqeVw8-snQZHrxcd6BO50SqWXlFwaEgC6wxWb1Y5ixcwJNe3_W_0nfFWZNIUAVi6Z-vMmYv-x_r4RdU5I242iEXwijta4q_KlNG_-uXzImye6mH9eIAvcBEWdwSRDPaCaam3bGlXCVh_UtM_vAw50WrMEY6p8k_wAUVf6AGw0ZL9MasfT",
    alt: "Students participating in a lively classroom debate",
    span: "row-span-2",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDLqz4H4eNbMPvYDzw5OeWfK6YEHv0Ppjw_0viVKRZf__UoC4qwzrfhllYCCNUoQs_Pk_cOh-JXd8aQi7nRQGq1dCeDNviNBSIpB1XEw70oIeCzAjMmeXZQ6ycSDiT2HHtkMHxPPWd6rE4hAfFCABiGbC-ZBcantVqXrrdlXx9fmwvrc4biBRvwWAip-KTzjNDi-Pbo4MudcUmytH3c8VM4yQvEWYjkDAtePgHnT6a67bMf1bnqpr_pRXRdyCdxDT8aXVFeZOl0_hwB",
    alt: "Students socializing in modern campus cafeteria",
    span: "row-span-1",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3_sjAHiEb1ADZp4QxvY9sYEFovFMvLw7VO8FE9X3xFIdlTXYMSkPhEwA9MjdZlUNuBddUOOV5TdceE_whcBITY5QBXF5TP8FRio2ksOtv4E4zBiUblBDHLNol21oDMJanae0cP_l0WtMUOfYobMFjj-6fuTVPViCYkRSPjGCGtkSG4NWNeTlSEMGy3MbAh9cs5NoruQ9DKMtMZPveHjRlOVY5Ob1Bw-RlgPvpWQvH0frsFifx8YQDMUrEfes0Fenuu7AImFGwS6Bm",
    alt: "Students walking on beautifully landscaped campus path",
    span: "row-span-2",
  },
];

export function GallerySection() {
  return (
    <section id="life" className="py-20 scroll-mt-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[#FFD700] font-bold tracking-widest text-sm uppercase">School Life</span>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] text-[#0A2540] mt-2 mb-4">
            Life at SmugFlex
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            A vibrant community where students grow academically, socially, and spiritually.
          </p>
        </motion.div>

        <div className="hidden md:grid grid-cols-3 gap-4 auto-rows-[200px]">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              className={`rounded-2xl overflow-hidden shadow-lg ${img.span} ${img.span === "row-span-2" ? "row-span-2" : ""}`}
            >
              <img className="w-full h-full object-cover" alt={img.alt} src={img.src} />
            </motion.div>
          ))}
        </div>

        <div className="md:hidden grid grid-cols-2 gap-3">
          {images.slice(0, 6).map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-xl overflow-hidden shadow-lg aspect-[4/3]"
            >
              <img className="w-full h-full object-cover" alt={img.alt} src={img.src} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
