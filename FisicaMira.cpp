extern "C" {

    float calcularY(float deltaY, float sensi, bool activo) {
        if (!activo) return deltaY;

        // Diminuir para 0.68f para a mira ficar mais precisa
        float dy = (deltaY * (sensi / 200.0f));

        // Zona de sucsao (Onde a magica acontece)
        if (dy > 14.0f && dy < 19.0f) {
            dy = 14.0f + ((dy - 14.0f) * 0.3f);
        }

        // Travar rigida nao passa do topo da cabeca
        if (dy > 19.0f) {
            dy = 19.0f;
        }

        return dy;
    }

} // Essa chave fecha o extern "C"