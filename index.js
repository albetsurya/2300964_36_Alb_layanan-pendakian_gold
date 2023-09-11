const express = require("express");
const expressLayouts = require("express-ejs-layouts");

const { body, validationResult, check } = require("express-validator");
const methodOverride = require("method-override");

const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

const db = require("./utils/db");

const app = express();
const port = 3000;

//* Setup Method-Override
app.use(methodOverride("_method"));

//* Setup EJS
app.set("view engine", "ejs");
app.use(expressLayouts); // third party middleware
app.use(express.static("public")); // Built-in middleware
app.use(express.urlencoded({ extended: true })); // Built-in middleware

//* Konfigurasi flash
app.use(cookieParser("secret"));
app.use(
  session({
    cookie: { maxAge: 6000 },
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(flash());

//* Halaman Beranda
app.get("/", (req, res) => {
  res.render("index.ejs", {
    nama: "Pendakian Gunung Rinjani",
    title: "Beranda",
    layout: "layouts/main-layout.ejs",
  });
});

// Halaman Profil
app.get("/profile", (req, res) => {
  res.render("profile.ejs", {
    title: "Halaman Profil",
    layout: "layouts/main-layout",
  });
});

// Halaman Destination
app.get("/destination", (req, res) => {
  res.render("destination.ejs", {
    title: "Destinasi Wisata",
    layout: "layouts/main-layout",
  });
});

// Halaman Pemesanan Ticket
app.get("/tickets", async (req, res) => {
  const tickets = await db("tickets").select();
  db.destroy();
  res.render("ticket.ejs", {
    title: "Halaman Pemesanan Ticket",
    layout: "layouts/main-layout",
    tickets,
    msg: req.flash("msg"),
  });
});

// Halaman form tambah data contact
// diletakkan sebelum halaman detail contact agar "add" tidak dikenali sebagai nama
app.get("/tickets/add", (req, res) => {
  res.render("add-ticket.ejs", {
    title: "Form Pemesanan Tiket",
    layout: "layouts/main-layout",
  });
});

//* Proses tambah data contact
app.post(
  "/tickets",
  [
    body("id").custom(async (value) => {
      // Cek apakah ID sudah ada dalam tabel 'tickets'
      const duplikat = await db("tickets").where({ id: value }).first();

      if (duplikat) {
        throw new Error("ID/NIK sudah digunakan!");
      }

      // Jika ID belum ada dalam tabel, maka data valid
      return true;
    }),
    check("nohp", "Bukan nomor HP").isMobilePhone("id-ID"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Jika error nya tidak kosong
      res.render("add-ticket.ejs", {
        title: "Form Pemesanan Ticket",
        layout: "layouts/main-layout",
        errors: errors.array(),
      });
    } else {
      try {
        await db("tickets").insert(req.body);
        // kirimkan message flash
        req.flash("msg", "Data contact berhasil ditambahkan!");
        res.redirect("/tickets");
      } catch (error) {
        // Tangani kesalahan penyisipan data ke database
        console.error(error);
        res.status(500).json({ error: "Gagal menambahkan data tiket" });
      }
    }
  }
);

// Proses delete contact
app.delete("/tickets", async (req, res) => {
  try {
    // Gunakan await untuk menunggu penghapusan selesai
    await db("tickets").where({ name: req.body.name }).delete();

    // Kirim pesan flash jika berhasil
    req.flash("msg", "Ticket berhasil dihapus!");

    // Redirect ke halaman "/tickets"
    res.redirect("/tickets");
  } catch (error) {
    // Tangani kesalahan jika terjadi masalah dalam penghapusan
    console.error(error);
    res.status(500).json({ error: "Gagal menghapus tiket" });
  }
});

// Halaman form edit data contact
app.get("/tickets/edit/:name", async (req, res) => {
  try {
    // Menggunakan await untuk mengambil data tiket berdasarkan nama
    const ticket = await db("tickets").where({ name: req.params.name }).first();

    if (!ticket) {
      // Tangani jika tiket tidak ditemukan
      return res.status(404).send("Tiket tidak ditemukan");
    }

    // Render halaman edit dengan data tiket yang akan diedit
    res.render("edit-contact.ejs", {
      title: "Form Edit Data Ticket",
      layout: "layouts/main-layout",
      ticket,
    });
  } catch (error) {
    // Tangani kesalahan jika terjadi masalah dalam pengambilan data
    console.error(error);
    res.status(500).send("Terjadi kesalahan dalam mengambil data tiket");
  }
});

// Proses edit data
app.put(
  "/tickets",
  [
    body("id").custom(async (value) => {
      // Cek apakah ID sudah ada dalam tabel 'tickets'
      const duplikat = await db("tickets").where({ id: value }).first();

      if (duplikat) {
        throw new Error("ID/NIK sudah digunakan!");
      }

      // Jika ID belum ada dalam tabel, maka data valid
      return true;
    }),
    check("nohp", "Bukan nomor HP").isMobilePhone("id-ID"),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Jika error nya tidak kosong
      res.render("add-ticket.ejs", {
        title: "Form Pemesanan Ticket",
        layout: "layouts/main-layout",
        errors: errors.array(),
        ticket: req.body, // Kirim data tiket kembali ke halaman edit
      });
    } else {
      try {
        // Memperbaharui data ticket
        db("tickets").where({ id: req.body.id }).update({
          name: req.body.name,
          nohp: req.body.nohp,
        });

        // kirimkan message flash
        req.flash("msg", "Data ticket berhasil diubah!");
        res.redirect("/tickets");
      } catch (error) {
        console.error(error);
        res.status(500).send("Terjadi kesalahan dalam memperbarui data tiket");
      }
    }
  }
);

// Halaman detail contact
app.get("/tickets/:name", async (req, res) => {
  try {
    const ticket = await db("tickets").where({ name: req.params.name }).first();

    if (!ticket) {
      // Tangani jika tiket tidak ditemukan
      return res.status(404).send("Tiket tidak ditemukan");
    }

    // Render halaman detail dengan data tiket
    res.render("detail.ejs", {
      title: "Halaman Detail",
      layout: "layouts/main-layout",
      ticket,
    });
  } catch (error) {
    // Tangani kesalahan jika terjadi masalah dalam pengambilan data
    console.error(error);
    res.status(500).send("Terjadi kesalahan dalam mengambil data tiket");
  }
});

app.listen(port, () => {
  console.log(`listening at port http://localhost:${port}`);
});
