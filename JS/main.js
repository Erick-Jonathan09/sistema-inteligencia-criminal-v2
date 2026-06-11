// OJO: Asegúrate de que la ruta de importación de firebase-config.js sea la correcta
import { auth, db } from '../JS/firebase-config.js'; 
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
// Agregamos 'addDoc' para la carga masiva
// Agregamos las herramientas para carga masiva y actualización quirúrgica
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
// Importamos la lista desde el archivo externo
import { listaCriminales } from './cargamento.js';

// Referencias a los elementos de tu HTML
const userNameSpan = document.querySelector('.user-name');
const userRoleSpan = document.querySelector('.user-role');
const btnLogout = document.getElementById('btn-logout');

// 1. LÓGICA PARA CERRAR SESIÓN
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("Sesión cerrada exitosamente");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    });
}

// 2. LÓGICA DE SEGURIDAD Y CARGA DE PERFIL
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docRef = doc(db, "usuarios", user.uid);
        
        try {
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if(userNameSpan) userNameSpan.innerText = data.nombre.toUpperCase(); 
                if(userRoleSpan) userRoleSpan.innerText = data.rango_oficial;        
            } else {
                console.warn("No se encontró información del perfil en Firestore.");
                if(userNameSpan) userNameSpan.innerText = "OFICIAL DESCONOCIDO";
            }
            
            // Llamamos a la función de las tarjetas
            window.cargarExpedientes();

        } catch (error) {
            console.error("Error al obtener perfil:", error);
        }
    } else {
        window.location.replace("../login.html"); 
    }
});

// --- LÓGICA DE FILTROS TÁCTICOS ---
const btnBuscar = document.getElementById('btn-buscar');

if (btnBuscar) {
    btnBuscar.addEventListener('click', () => {
        const filtros = {
            exp: document.getElementById('filtro-exp').value.trim().toLowerCase(),
            apodo: document.getElementById('filtro-apodo').value.trim().toLowerCase(),
            estado: document.getElementById('filtro-estado').value.toLowerCase(),
            amenaza: document.getElementById('filtro-amenaza').value.toLowerCase()
        };
        window.cargarExpedientes(filtros);
    });
}

// 3. FUNCIÓN PARA CARGAR LAS TARJETAS AL HTML (CON FILTROS INTEGRADOS)
window.cargarExpedientes = async function(filtros = { exp: '', apodo: '', estado: '', amenaza: '' }) {
    const gridCriminales = document.querySelector('.criminals-grid');
    if(gridCriminales) gridCriminales.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "criminales"));

        if (querySnapshot.empty) {
            console.log("Advertencia: La colección 'criminales' está vacía.");
            if(gridCriminales) gridCriminales.innerHTML = "<p style='color: #888; text-align: center; width: 100%;'>Archivero vacío.</p>";
            return;
        }

        let coincidencias = 0;

        querySnapshot.forEach((doc) => {
            const criminal = doc.data(); 
            const bdExp = (criminal.numero_expediente || "").toLowerCase();
            const bdApodo = (criminal.alias || "").toLowerCase();
            const bdEstado = (criminal.estado || "").toLowerCase();
            const bdAmenaza = (criminal.nivel_amenaza || "").toLowerCase();

            if (filtros.exp && !bdExp.includes(filtros.exp)) return; 
            if (filtros.apodo && !bdApodo.includes(filtros.apodo)) return;
            if (filtros.estado && !bdEstado.includes(filtros.estado)) return;
            if (filtros.amenaza && !bdAmenaza.includes(filtros.amenaza)) return;

            coincidencias++;

            const tarjeta = `
                <article class="criminal-card">
                    <img src="${criminal.foto_url}" class="card-img" alt="Foto de ${criminal.alias || 'criminal'}">
                    <div class="card-content">
                        <span style="font-size: 0.8rem; color: #888; font-family: monospace;">EXP: ${criminal.numero_expediente}</span>
                        <h3>${criminal.alias}</h3>
                        <p class="real-name">${criminal.nombre}</p>
                        <div class="status-tags">
                            <span class="tag-status ${criminal.estado === 'Fallecida' || criminal.estado === 'Fallecido' ? 'status-red' : 'status-orange'}">${criminal.estado}</span>
                            <span class="tag-threat threat-orange">${criminal.nivel_amenaza}</span>
                        </div>
                        <button class="btn-view" onclick="verDetalle('${doc.id}')">VER EXPEDIENTE</button>
                    </div>
                </article>
            `;
            if(gridCriminales) gridCriminales.innerHTML += tarjeta;
        }); 

        if (coincidencias === 0 && gridCriminales) {
            gridCriminales.innerHTML = `<div style="text-align: center; width: 100%; grid-column: 1 / -1; padding: 40px; border: 1px dashed #e74c3c; border-radius: 8px;">
                    <h3 style="color: #e74c3c; margin-bottom: 10px;">NO SE ENCONTRARON EXPEDIENTES</h3>
                    <p style="color: #888;">Modifique los parámetros de búsqueda e intente de nuevo.</p>
                </div>`;
        }

    } catch (error) {
        console.error("Error al cargar los datos desde Firebase:", error);
    }
};

// 4. FUNCIÓN PARA VER DETALLES
window.verDetalle = async function(idDocumento) {
    try {
        const docRef = doc(db, "criminales", idDocumento); 
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const datos = docSnap.data();

            const expNum = document.getElementById('modal-exp-num');
            if(expNum) expNum.innerText = `EXP: ${datos.numero_expediente || '000'}`;
            
            document.getElementById('modal-img').src = datos.foto_url || '';
            document.getElementById('modal-alias').innerText = datos.alias ? `"${datos.alias.toUpperCase()}"` : "SIN ALIAS";
            document.getElementById('modal-nombre').innerText = datos.nombre.toUpperCase();
            
            const estadoSpan = document.getElementById('modal-estado-valor');
            estadoSpan.innerText = datos.estado || 'DESCONOCIDO';
            estadoSpan.style.color = (datos.estado === 'Fallecida' || datos.estado === 'Fallecido') ? '#e74c3c' : '#f1c40f'; 

            document.getElementById('modal-tipo').innerText = datos.tipo_asesino || "N/A";
            document.getElementById('modal-perfil').innerText = datos.perfil || "N/A";
            document.getElementById('modal-caracteristicas').innerText = datos.caracteristicas || "N/A";

            const threatLevelRaw = datos.nivel_amenaza || '';
            const threatLevel = threatLevelRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            const gaugeFill = document.getElementById('modal-gauge-fill');
            const threatText = document.getElementById('modal-threat-text');
            
            if (threatText) threatText.innerText = datos.nivel_amenaza || 'DESCONOCIDO';

            if (gaugeFill) {
                gaugeFill.style.transform = "rotate(-135deg)"; 
                gaugeFill.style.borderTopColor = "#222";
                gaugeFill.style.borderLeftColor = "#222";
            }

            setTimeout(() => {
                if (!gaugeFill) return;
                switch (threatLevel) {
                    case 'critico': 
                        gaugeFill.style.borderTopColor = "#e74c3c"; gaugeFill.style.borderLeftColor = "#e74c3c";
                        gaugeFill.style.transform = "rotate(45deg)"; threatText.style.color = "#e74c3c";
                        break;
                    case 'alto': 
                        gaugeFill.style.borderTopColor = "#e67e22"; gaugeFill.style.borderLeftColor = "#e67e22";
                        gaugeFill.style.transform = "rotate(0deg)"; threatText.style.color = "#e67e22";
                        break;
                    case 'medio': 
                        gaugeFill.style.borderTopColor = "#f1c40f"; gaugeFill.style.borderLeftColor = "#f1c40f";
                        gaugeFill.style.transform = "rotate(-45deg)"; threatText.style.color = "#f1c40f";
                        break;
                    case 'bajo': 
                        gaugeFill.style.borderTopColor = "#2ecc71"; gaugeFill.style.borderLeftColor = "#2ecc71";
                        gaugeFill.style.transform = "rotate(-90deg)"; threatText.style.color = "#2ecc71";
                        break;
                    default: 
                        gaugeFill.style.transform = "rotate(-135deg)"; threatText.style.color = "#888";
                        break;
                }
            }, 150);

            document.getElementById('modal-psicosocial').innerText = datos.perfil_psicosocial || "Información clasificada.";
            document.getElementById('modal-resena').innerText = datos.resena_delictiva || "Información clasificada.";
            document.getElementById('modal-dinamica').innerText = datos.dinamica_delictiva || "Información clasificada.";
            document.getElementById('modal-motivacion').innerText = datos.motivacion || "Información clasificada.";
            document.getElementById('modal-victimas').innerText = datos.victimas || '0';

            document.getElementById('modal-expediente').style.display = 'flex';

        } else {
            alert("El expediente no existe.");
        }
    } catch (error) {
        console.error("Error al obtener los detalles:", error);
    }
};

window.cerrarModal = function() {
    document.getElementById('modal-expediente').style.display = 'none';
};

// =========================================================
// ⚠️ OPERACIÓN DE CARGA CLASIFICADA (SOLO ADMIN)
// =========================================================
window.detonarCargaMasiva = async function() {
    console.log("Iniciando transferencia de datos clasificados...");
    let subidos = 0;

    for (const sujeto of listaCriminales) {
        try {
            // Aseguramos que los campos coincidan exactamente con tu estructura
            await addDoc(collection(db, "criminales"), {
                alias: sujeto.alias || "",
                dinamica_delictiva: sujeto.dinamica_delictiva || "",
                estado: sujeto.estado || "",
                foto_url: sujeto.foto_url || "",
                id_criminal: sujeto.id_criminal || "",
                motivacion: sujeto.motivacion || "",
                nivel_amenaza: sujeto.nivel_amenaza || "",
                nombre: sujeto.nombre || "",
                numero_expediente: sujeto.numero_expediente || "",
                perfil: sujeto.perfil || "",
                perfil_psicosocial: sujeto.perfil_psicosocial || "", 
                resena_delictiva: sujeto.resena_delictiva || "",
                tipo_asesino: sujeto.tipo_asesino || "",
                victimas: sujeto.victimas || 0
            });
            subidos++;
            console.log(`[+] Expediente ${sujeto.numero_expediente} (${sujeto.alias}) inyectado.`);
        } catch (error) {
            console.error(`[X] Error en expediente de ${sujeto.alias}:`, error);
        }
    }
    alert(`OPERACIÓN FINALIZADA. ${subidos} expedientes asegurados en la bóveda.`);
    window.cargarExpedientes(); // Actualiza la vista
};

    // =========================================================
// ⚠️ OPERACIÓN DE ACTUALIZACIÓN QUIRÚRGICA POR ID (1-50)
// =========================================================
window.corregirAmenazas = async function() {
    // 1. Defina aquí los IDs (del 1 al 50) que necesitan corrección.
    // OJO: Si en su base de datos son números, quite las comillas (ej: id: 1)
    const correcciones = [
    { id: "1", nivel_correcto: "CRÍTICO" },
    { id: "2", nivel_correcto: "ALTO" },
    { id: "3", nivel_correcto: "CRÍTICO" },
    { id: "4", nivel_correcto: "ALTO" },
    { id: "5", nivel_correcto: "ALTO" },
    { id: "6", nivel_correcto: "CRÍTICO" },
    { id: "7", nivel_correcto: "ALTO" },
    { id: "8", nivel_correcto: "CRÍTICO" },
    { id: "9", nivel_correcto: "ALTO" },
    { id: "10", nivel_correcto: "ALTO" },
    { id: "11", nivel_correcto: "CRÍTICO" },
    { id: "12", nivel_correcto: "ALTO" },
    { id: "13", nivel_correcto: "MEDIO" },
    { id: "14", nivel_correcto: "ALTO" },
    { id: "15", nivel_correcto: "CRÍTICO" },
    { id: "16", nivel_correcto: "ALTO" },
    { id: "17", nivel_correcto: "CRÍTICO" },
    { id: "18", nivel_correcto: "ALTO" },
    { id: "19", nivel_correcto: "ALTO" },
    { id: "20", nivel_correcto: "CRÍTICO" },
    { id: "21", nivel_correcto: "ALTO" },
    { id: "22", nivel_correcto: "MEDIO" },
    { id: "23", nivel_correcto: "ALTO" },
    { id: "24", nivel_correcto: "CRÍTICO" },
    { id: "25", nivel_correcto: "ALTO" },
    { id: "26", nivel_correcto: "CRÍTICO" },
    { id: "27", nivel_correcto: "ALTO" },
    { id: "28", nivel_correcto: "ALTO" },
    { id: "29", nivel_correcto: "CRÍTICO" },
    { id: "30", nivel_correcto: "ALTO" },
    
    // Nombres específicos del 31 al 50 evaluados históricamente
    { id: "31", nivel_correcto: "CRÍTICO" }, // Adolfo de Jesús Constanzo (Secta, tortura, múltiples víctimas)
    { id: "32", nivel_correcto: "CRÍTICO" }, // Ángel Maturino Reséndiz (15+ víctimas transfronterizas)
    { id: "33", nivel_correcto: "ALTO" },    // María Alejandra Lafuente (Desmembramiento)
    { id: "34", nivel_correcto: "MEDIO" },   // Diana la Cazadora (Vigilante, ~2 víctimas, no sádica)
    { id: "35", nivel_correcto: "CRÍTICO" }, // Gumaro de Dios Álvarez (Canibalismo)
    { id: "36", nivel_correcto: "ALTO" },    // Erick Francisco Robledo (Extrema crueldad visual, 1 víctima)
    { id: "37", nivel_correcto: "ALTO" },    // Flor Cazarín (Múltiples víctimas por envenenamiento/robo)
    { id: "38", nivel_correcto: "ALTO" },    // Daniel Audiel López (Feminicida serial)
    { id: "39", nivel_correcto: "ALTO" },    // Alejandro N. (Asesinatos en serie)
    { id: "40", nivel_correcto: "CRÍTICO" }, // Gilberto Ortega (Asesino serial de niños)
    { id: "41", nivel_correcto: "CRÍTICO" }, // Juana Barraza (16 víctimas vulnerables)
    { id: "42", nivel_correcto: "CRÍTICO" }, // Andrés Filomeno Mendoza (30+ víctimas, desmembramiento)
    { id: "43", nivel_correcto: "CRÍTICO" }, // Juan Carlos Hernández (20+ víctimas, canibalismo)
    { id: "44", nivel_correcto: "ALTO" },    // Raúl Osiel Marroquín (Secuestro y tortura por odio)
    { id: "45", nivel_correcto: "ALTO" },    // Gregorio Cárdenas (4 víctimas, necrofilia)
    { id: "46", nivel_correcto: "CRÍTICO" }, // Delfina González - Poquianchis (90+ víctimas, esclavitud)
    { id: "47", nivel_correcto: "CRÍTICO" }, // Miguel Cortés Miranda (Feminicida serial reciente)
    { id: "48", nivel_correcto: "CRÍTICO" }, // Filiberto Hernández (Asesino serial de menores)
    { id: "49", nivel_correcto: "CRÍTICO" }, // María de Jesús González - Poquianchis (90+ víctimas)
    { id: "50", nivel_correcto: "CRÍTICO" }  // Giulia Tofana (600 víctimas estimadas)
];

    console.log("Iniciando escaneo y corrección por ID numérico...");
    let parcheados = 0;

    for (const ajuste of correcciones) {
        try {
            // Buscamos el documento donde el id_criminal sea exactamente ese número/texto
            const q = query(collection(db, "criminales"), where("id_criminal", "==", ajuste.id));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                // Aplicamos el parche de nivel_amenaza
                snapshot.forEach(async (documento) => {
                    const docRef = doc(db, "criminales", documento.id);
                    
                    await updateDoc(docRef, {
                        nivel_amenaza: ajuste.nivel_correcto
                    });
                    
                    parcheados++;
                    console.log(`[+] ID ${ajuste.id} reasignado a Nivel: ${ajuste.nivel_correcto}`);
                });
            } else {
                console.warn(`[!] El ID ${ajuste.id} no arrojó resultados (verifique si lleva comillas o no).`);
            }
        } catch (error) {
            console.error(`[X] Error crítico al corregir el ID ${ajuste.id}:`, error);
        }
    }
    
    setTimeout(() => {
        alert(`CORRECCIÓN FINALIZADA. ${parcheados} expedientes actualizados.`);
        window.cargarExpedientes(); 
    }, 1500);
};




